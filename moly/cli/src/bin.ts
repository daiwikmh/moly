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
