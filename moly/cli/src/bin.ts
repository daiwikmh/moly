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
        console.log('No config found. Run: npx @moly/lido');
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
      console.log('Config deleted. Run: npx @moly/lido  to set up again.');
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

    // ── moly --server (force-start, used in AI client configs) ────────
    case '--server': {
      if (!configExists()) {
        process.stderr.write(
          'ERROR: No config found. Run: npx @moly/lido  to set up first.\n'
        );
        process.exit(1);
      }
      await startServer();
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
          `@moly/lido — starting MCP server (${cfg.mode} · ${cfg.network})\n`
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
