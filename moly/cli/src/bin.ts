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
