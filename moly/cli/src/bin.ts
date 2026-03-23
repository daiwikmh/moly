import { configExists, loadConfig, deleteConfig, redactedConfig } from './config/store.js';
import { runWizard } from './setup/wizard.js';

const args = process.argv.slice(2);
const command = args[0];

async function startServer() {
  // Dynamically import the server so it only starts when needed
  // (avoids loading viem/LidoSDK during wizard)
  await import('./server/index.js');
}

async function main() {
  switch (command) {
    // ── moly setup ────────────────────────────────────────────────────
    case 'setup': {
      const { cfg, terminalMode } = await runWizard();
      if (terminalMode) {
        const { startChatSession } = await import('./chat/session.js');
        await startChatSession(cfg);
      } else {
        await startServer();
      }
      break;
    }

    // ── moly config ───────────────────────────────────────────────────
    case 'config': {
      if (!configExists()) {
        console.log('No config found. Run: npx @moly-mcp/lido');
        process.exit(1);
      }
      const cfg = loadConfig();
      console.log('\nMoly configuration (~/.moly/config.json):\n');
      console.log(JSON.stringify(redactedConfig(cfg), null, 2));
      console.log('\nTo change settings: moly setup');
      break;
    }

    // ── moly reset ────────────────────────────────────────────────────
    case 'reset': {
      if (!configExists()) {
        console.log('No config found — nothing to reset.');
        process.exit(0);
      }
      deleteConfig();
      console.log('Config deleted. Run: npx @moly-mcp/lido  to set up again.');
      break;
    }

    // ── moly alert ─────────────────────────────────────────────────────
    case 'alert': {
      const sub = args[1];
      const getFlag = (flag: string) => {
        const i = args.indexOf(flag);
        return i !== -1 ? args[i + 1] : undefined;
      };

      switch (sub) {
        case 'add': {
          const condition = args[2];
          if (!condition) { console.log('Usage: moly alert add <condition> [threshold] [--channel webhook]'); break; }
          const threshold = args[3] && !args[3].startsWith('-') ? parseFloat(args[3]) : undefined;
          const channel = getFlag('--channel') ?? 'telegram';
          const { setAlert } = await import('./tools/alerts.js');
          const alert = setAlert({ condition, threshold, channel });
          console.log('Alert created:', JSON.stringify(alert, null, 2));
          break;
        }
        case 'list': {
          const { listAlerts } = await import('./tools/alerts.js');
          console.log(JSON.stringify(listAlerts(), null, 2));
          break;
        }
        case 'remove': {
          const id = args[2];
          if (!id) { console.log('Usage: moly alert remove <id>'); break; }
          const { removeAlertById } = await import('./tools/alerts.js');
          console.log(JSON.stringify(removeAlertById(id), null, 2));
          break;
        }
        case 'channels': {
          const { configureAlertChannels } = await import('./tools/alerts.js');
          const result = configureAlertChannels({
            telegram_token: getFlag('--telegram-token'),
            telegram_chat_id: getFlag('--telegram-chat'),
            webhook_url: getFlag('--webhook-url'),
          });
          console.log('Channels configured:', JSON.stringify(result, null, 2));
          break;
        }
        case 'daemon': {
          if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
          const { runDaemon } = await import('./alerts/daemon.js');
          await runDaemon();
          break;
        }
        case 'start': {
          const { spawn } = await import('child_process');
          const child = spawn(process.argv[0], [process.argv[1], 'alert', 'daemon'], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          console.log(`Alert daemon started (PID: ${child.pid})`);
          break;
        }
        default:
          console.log('Usage: moly alert <add|list|remove|channels|daemon|start>');
      }
      break;
    }

    // ── moly monitor ──────────────────────────────────────────────────
    case 'monitor': {
      const sub = args[1];
      switch (sub) {
        case 'start': {
          const { spawn } = await import('child_process');
          const child = spawn(process.argv[0], [process.argv[1], 'alert', 'daemon'], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          console.log(`Monitor daemon started (PID: ${child.pid})`);
          break;
        }
        case 'status': {
          const { loadAlerts } = await import('./alerts/store.js');
          const data = loadAlerts();
          if (!data.daemonPid) {
            console.log('No daemon running (or never started).');
          } else {
            let alive = false;
            try { process.kill(data.daemonPid, 0); alive = true; } catch {}
            console.log(`PID: ${data.daemonPid}  alive: ${alive}`);
            if (data.daemonStartedAt) console.log(`Started: ${data.daemonStartedAt}`);
            if (data.lastCheckAt) console.log(`Last check: ${data.lastCheckAt}`);
            console.log(`Active alerts: ${data.alerts.filter((a: any) => a.enabled).length}`);
          }
          break;
        }
        case 'stop': {
          const { loadAlerts, saveAlerts } = await import('./alerts/store.js');
          const data = loadAlerts();
          if (!data.daemonPid) {
            console.log('No daemon PID recorded.');
            break;
          }
          try {
            process.kill(data.daemonPid, 'SIGTERM');
            console.log(`Sent SIGTERM to PID ${data.daemonPid}`);
          } catch {
            console.log(`PID ${data.daemonPid} not running.`);
          }
          data.daemonPid = undefined;
          saveAlerts(data);
          break;
        }
        default:
          console.log('Usage: moly monitor <start|status|stop>');
      }
      break;
    }

    // ── moly bounds ──────────────────────────────────────────────────
    case 'bounds': {
      const sub = args[1];
      const getFlag = (flag: string) => {
        const i = args.indexOf(flag);
        return i !== -1 ? args[i + 1] : undefined;
      };

      switch (sub) {
        case 'show':
        case undefined: {
          const { loadBounds } = await import('./bounds/store.js');
          console.log(JSON.stringify(loadBounds(), null, 2));
          break;
        }
        case 'set': {
          const { loadBounds, saveBounds } = await import('./bounds/store.js');
          const b = loadBounds();
          const mst = getFlag('--max-stake-per-tx');
          const mds = getFlag('--max-daily-stake');
          const mer = getFlag('--min-eth-reserve');
          const art = getFlag('--auto-restake-threshold');
          const gov = getFlag('--governance-auto-vote');
          if (mst) b.maxStakePerTx = parseFloat(mst);
          if (mds) b.maxDailyStake = parseFloat(mds);
          if (mer) b.minEthReserve = parseFloat(mer);
          if (art) b.autoRestakeThreshold = parseFloat(art);
          if (gov) b.governanceAutoVote = gov === 'true';
          saveBounds(b);
          console.log('Bounds updated:', JSON.stringify(b, null, 2));
          break;
        }
        case 'reset': {
          const { resetBounds } = await import('./bounds/store.js');
          resetBounds();
          console.log('Bounds reset to defaults.');
          break;
        }
        default:
          console.log('Usage: moly bounds [show|set|reset]');
          console.log('  set flags: --max-stake-per-tx, --max-daily-stake, --min-eth-reserve, --auto-restake-threshold, --governance-auto-vote');
      }
      break;
    }

    // ── moly ledger ──────────────────────────────────────────────────
    case 'ledger': {
      const sub = args[1];
      const getFlag = (flag: string) => {
        const i = args.indexOf(flag);
        return i !== -1 ? args[i + 1] : undefined;
      };
      const { initLedger, queryLedger, ledgerStats, exportLedger } = await import('./ledger/store.js');
      initLedger();

      switch (sub) {
        case 'list': {
          const tool = getFlag('--tool');
          const since = getFlag('--since');
          const limit = getFlag('--limit');
          const rows = queryLedger({ tool: tool ?? undefined, since: since ?? undefined, limit: limit ? parseInt(limit) : 50 });
          console.log(JSON.stringify(rows, null, 2));
          break;
        }
        case 'stats': {
          const since = getFlag('--since');
          console.log(JSON.stringify(ledgerStats(since ?? undefined), null, 2));
          break;
        }
        case 'export': {
          const format = (getFlag('--format') ?? 'json') as 'json' | 'csv';
          console.log(exportLedger(format));
          break;
        }
        default:
          console.log('Usage: moly ledger <list|stats|export>');
          console.log('  list: --tool <name> --since <ISO date> --limit <n>');
          console.log('  export: --format <json|csv>');
      }
      break;
    }

    // ── moly position ────────────────────────────────────────────────
    case 'position': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const { getTotalPosition } = await import('./tools/position.js');
      const address = args[1];
      const pos = await getTotalPosition(address);
      console.log(JSON.stringify(pos, null, 2));
      break;
    }

    // ── moly terminal — start chat session directly ───────────────────
    case 'terminal': {
      if (!configExists()) {
        const { cfg, terminalMode } = await runWizard();
        if (terminalMode) {
          const { startChatSession } = await import('./chat/session.js');
          await startChatSession(cfg);
        } else {
          await startServer();
        }
      } else {
        const cfg = loadConfig();
        const { startChatSession } = await import('./chat/session.js');
        await startChatSession(cfg);
      }
      break;
    }

    // ── moly --help / help / -h ─────────────────────────────────────────
    case '--help':
    case '-h':
    case 'help': {
      console.log(`
moly — Lido MCP Server CLI

Setup:
  setup              Run the setup wizard
  config             Show current configuration
  reset              Delete configuration
  wallet             Show wallet address

Staking:
  balance [addr]     Get ETH, stETH, wstETH balances
  rewards [addr] [d] Get staking rewards (default 7 days)
  stake <amount>     Stake ETH to receive stETH
  withdraw <amount>  Request stETH withdrawal
  withdrawals [addr] List pending withdrawal requests
  claim <id1> [...]  Claim finalized withdrawals
  wrap <amount>      Wrap stETH to wstETH
  unwrap <amount>    Unwrap wstETH to stETH
  rate               Get stETH/wstETH conversion rate
  position [addr]    Cross-chain position summary

Governance:
  proposals [count]  List recent DAO proposals
  proposal <id>      Show proposal details
  vote <id> yea|nay  Vote on a proposal

Alerts:
  alert add <cond>   Add alert (e.g. "balance_below 0.5")
  alert list         List active alerts
  alert remove <id>  Remove alert
  alert channels     Configure Telegram/webhook
  alert start        Start alert daemon

Bounds:
  bounds [show]      Show safety bounds
  bounds set         Set bounds (--max-stake-per-tx, --max-daily-stake, --min-eth-reserve)
  bounds reset       Reset to defaults

Ledger:
  ledger list        List entries (--tool, --since, --limit)
  ledger stats       Show statistics
  ledger export      Export (--format json|csv)

Agent:
  terminal           Start interactive chat session
  --server           Start MCP server (for AI client configs)

  help, --help       Show this help
  --version          Show version

Add --dry-run to any write command to simulate without broadcasting.
`);
      break;
    }

    // ── moly --version / -v ──────────────────────────────────────────
    case '--version':
    case '-v': {
      const { createRequire } = await import('module');
      const pkg = createRequire(import.meta.url)('../package.json');
      console.log(`@moly-mcp/lido v${pkg.version}`);
      break;
    }

    // ── moly --server (force-start, used in AI client configs) ────────
    case '--server': {
      if (!configExists()) {
        process.stderr.write(
          'ERROR: No config found. Run: npx @moly-mcp/lido  to set up first.\n'
        );
        process.exit(1);
      }
      await startServer();
      break;
    }

    // ── Direct tool commands ──────────────────────────────────────────

    case 'balance': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const { getBalance } = await import('./tools/balance.js');
      const addr = args[1];
      console.log(JSON.stringify(await getBalance(addr), null, 2));
      break;
    }

    case 'rewards': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const { getRewards } = await import('./tools/balance.js');
      const addr = args[1];
      const days = args[2] ? parseInt(args[2]) : 7;
      console.log(JSON.stringify(await getRewards(addr, days), null, 2));
      break;
    }

    case 'stake': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const amount = args[1];
      if (!amount) { console.log('Usage: moly stake <amount> [--dry-run]'); break; }
      const dryRun = args.includes('--dry-run');
      const { stakeEth } = await import('./tools/stake.js');
      console.log(JSON.stringify(await stakeEth(amount, dryRun), null, 2));
      break;
    }

    case 'wrap': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const amount = args[1];
      if (!amount) { console.log('Usage: moly wrap <amount> [--dry-run]'); break; }
      const dryRun = args.includes('--dry-run');
      const { wrapSteth } = await import('./tools/wrap.js');
      console.log(JSON.stringify(await wrapSteth(amount, dryRun), null, 2));
      break;
    }

    case 'unwrap': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const amount = args[1];
      if (!amount) { console.log('Usage: moly unwrap <amount> [--dry-run]'); break; }
      const dryRun = args.includes('--dry-run');
      const { unwrapWsteth } = await import('./tools/wrap.js');
      console.log(JSON.stringify(await unwrapWsteth(amount, dryRun), null, 2));
      break;
    }

    case 'withdraw': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const amount = args[1];
      if (!amount) { console.log('Usage: moly withdraw <amount> [--dry-run]'); break; }
      const dryRun = args.includes('--dry-run');
      const { requestWithdrawal } = await import('./tools/unstake.js');
      console.log(JSON.stringify(await requestWithdrawal(amount, dryRun), null, 2));
      break;
    }

    case 'claim': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const ids = args.slice(1).filter(a => !a.startsWith('--'));
      if (!ids.length) { console.log('Usage: moly claim <id1> [id2...] [--dry-run]'); break; }
      const dryRun = args.includes('--dry-run');
      const { claimWithdrawals } = await import('./tools/unstake.js');
      console.log(JSON.stringify(await claimWithdrawals(ids, dryRun), null, 2));
      break;
    }

    case 'withdrawals': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const addr = args[1];
      const { getWithdrawalRequests } = await import('./tools/unstake.js');
      console.log(JSON.stringify(await getWithdrawalRequests(addr), null, 2));
      break;
    }

    case 'proposals': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const count = args[1] ? parseInt(args[1]) : 5;
      const { getProposals } = await import('./tools/governance.js');
      console.log(JSON.stringify(await getProposals(count), null, 2));
      break;
    }

    case 'proposal': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const id = args[1];
      if (!id) { console.log('Usage: moly proposal <id>'); break; }
      const { getProposal } = await import('./tools/governance.js');
      console.log(JSON.stringify(await getProposal(parseInt(id)), null, 2));
      break;
    }

    case 'vote': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const id = args[1];
      const side = args[2];
      if (!id || !side) { console.log('Usage: moly vote <proposal_id> <yea|nay> [--dry-run]'); break; }
      const support = side.toLowerCase() === 'yea' || side.toLowerCase() === 'yes';
      const dryRun = args.includes('--dry-run');
      const { castVote } = await import('./tools/governance.js');
      console.log(JSON.stringify(await castVote(parseInt(id), support, dryRun), null, 2));
      break;
    }

    case 'rate': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const { getConversionRate } = await import('./tools/wrap.js');
      console.log(JSON.stringify(await getConversionRate(), null, 2));
      break;
    }

    case 'wallet': {
      if (!configExists()) { console.log('No config. Run: moly setup'); process.exit(1); }
      const { getRuntime } = await import('./server/runtime.js');
      try {
        console.log(getRuntime().getAddress());
      } catch (e: any) {
        console.log('No wallet configured:', e.message);
      }
      break;
    }

    // ── moly (no args) — wizard if first run, else start server ───────
    default: {
      if (!configExists()) {
        const { cfg, terminalMode } = await runWizard();
        if (terminalMode) {
          const { startChatSession } = await import('./chat/session.js');
          await startChatSession(cfg);
        } else {
          await startServer();
        }
      } else {
        const cfg = loadConfig();
        process.stderr.write(
          `@moly-mcp/lido — starting MCP server (${cfg.mode} · ${cfg.network})\n`
        );
        await startServer();
      }
      break;
    }
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
