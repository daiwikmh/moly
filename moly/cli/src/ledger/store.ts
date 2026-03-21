import Database from 'better-sqlite3';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DB_PATH = join(homedir(), '.moly', 'ledger.db');
const MARKER = join(homedir(), '.moly', '.ledger_imported');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      tool TEXT NOT NULL,
      args TEXT,
      result TEXT,
      wallet TEXT,
      chain TEXT,
      status TEXT DEFAULT 'ok',
      tx_hash TEXT,
      gas_used TEXT,
      amount TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_ts ON ledger(timestamp);
    CREATE INDEX IF NOT EXISTS idx_ledger_tool ON ledger(tool);
    CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger(wallet);
    CREATE INDEX IF NOT EXISTS idx_ledger_tx ON ledger(tx_hash);
  `);
  return _db;
}

export function initLedger(): void {
  getDb();
  importJsonlIfNeeded();
}

export function logEntry(entry: {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  wallet?: string;
  chain?: string;
  status?: 'ok' | 'error';
  tx_hash?: string;
  gas_used?: string;
  amount?: string;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO ledger (timestamp, tool, args, result, wallet, chain, status, tx_hash, gas_used, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    new Date().toISOString(),
    entry.tool,
    JSON.stringify(entry.args),
    entry.result.slice(0, 4000),
    entry.wallet ?? null,
    entry.chain ?? null,
    entry.status ?? 'ok',
    entry.tx_hash ?? null,
    entry.gas_used ?? null,
    entry.amount ?? null,
  );
}

export function queryLedger(opts: {
  tool?: string;
  wallet?: string;
  chain?: string;
  since?: string;
  tx_hash?: string;
  limit?: number;
} = {}): Record<string, unknown>[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.tool) { conditions.push('tool = ?'); params.push(opts.tool); }
  if (opts.wallet) { conditions.push('wallet = ?'); params.push(opts.wallet); }
  if (opts.chain) { conditions.push('chain = ?'); params.push(opts.chain); }
  if (opts.since) { conditions.push('timestamp >= ?'); params.push(opts.since); }
  if (opts.tx_hash) { conditions.push('tx_hash = ?'); params.push(opts.tx_hash); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = opts.limit ?? 50;

  return db.prepare(`SELECT * FROM ledger ${where} ORDER BY id DESC LIMIT ?`).all(...params, limit) as Record<string, unknown>[];
}

export function ledgerStats(since?: string): Record<string, unknown> {
  const db = getDb();
  const where = since ? 'WHERE timestamp >= ?' : '';
  const params = since ? [since] : [];

  const total = (db.prepare(`SELECT COUNT(*) as count FROM ledger ${where}`).get(...params) as any)?.count ?? 0;
  const errors = (db.prepare(`SELECT COUNT(*) as count FROM ledger ${where ? where + ' AND' : 'WHERE'} status = 'error'`).get(...params) as any)?.count ?? 0;

  const byTool = db.prepare(`SELECT tool, COUNT(*) as count FROM ledger ${where} GROUP BY tool ORDER BY count DESC`).all(...params) as any[];

  // sum staked amounts
  const stakeWhere = since
    ? `WHERE tool = 'stake_eth' AND status = 'ok' AND timestamp >= ?`
    : `WHERE tool = 'stake_eth' AND status = 'ok'`;
  const staked = db.prepare(`SELECT SUM(CAST(amount AS REAL)) as total FROM ledger ${stakeWhere}`).get(...params) as any;

  return {
    total,
    errors,
    byTool,
    totalStakedEth: (staked?.total ?? 0).toFixed(6),
  };
}

export function exportLedger(opts: { format: 'json' | 'csv'; limit?: number; since?: string }): string {
  const rows = queryLedger({ since: opts.since, limit: opts.limit ?? 10000 });

  if (opts.format === 'csv') {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => {
        const v = String(row[h] ?? '');
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(','));
    }
    return lines.join('\n');
  }

  return JSON.stringify(rows, null, 2);
}

function importJsonlIfNeeded(): void {
  if (existsSync(MARKER)) return;
  const tradesDir = join(process.cwd(), 'trades');
  if (!existsSync(tradesDir)) {
    writeMarker();
    return;
  }

  const files = readdirSync(tradesDir).filter((f) => f.endsWith('.jsonl'));
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO ledger (timestamp, tool, args, result, status)
    VALUES (?, ?, ?, ?, 'ok')
  `);

  const importAll = db.transaction(() => {
    for (const file of files) {
      const lines = readFileSync(join(tradesDir, file), 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const rec = JSON.parse(line);
          insert.run(rec.ts, rec.tool, JSON.stringify(rec.args), JSON.stringify(rec.result));
        } catch { /* skip bad lines */ }
      }
    }
  });

  importAll();
  writeMarker();
}

function writeMarker(): void {
  try {
    const { writeFileSync: wf } = require('fs');
    wf(MARKER, new Date().toISOString(), 'utf-8');
  } catch { /* non-fatal */ }
}
