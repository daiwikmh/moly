import { existsSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { Bounds } from './types.js';

const BOUNDS_PATH = join(homedir(), '.moly', 'bounds.json');

export const DEFAULT_BOUNDS: Bounds = {
  maxStakePerTx: 10,
  maxDailyStake: 50,
  minEthReserve: 0.5,
  autoRestakeThreshold: 0.05,
  governanceAutoVote: false,
  dailyStaked: 0,
  lastResetDate: new Date().toISOString().slice(0, 10),
};

export function loadBounds(): Bounds {
  if (!existsSync(BOUNDS_PATH)) return { ...DEFAULT_BOUNDS };
  try {
    return { ...DEFAULT_BOUNDS, ...JSON.parse(readFileSync(BOUNDS_PATH, 'utf-8')) };
  } catch {
    return { ...DEFAULT_BOUNDS };
  }
}

export function saveBounds(b: Bounds): void {
  writeFileSync(BOUNDS_PATH, JSON.stringify(b, null, 2), 'utf-8');
  try { chmodSync(BOUNDS_PATH, 0o600); } catch { /* non-POSIX */ }
}

export function resetBounds(): void {
  if (existsSync(BOUNDS_PATH)) unlinkSync(BOUNDS_PATH);
}
