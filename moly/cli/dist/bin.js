#!/usr/bin/env node
import {
  configExists,
  deleteConfig,
  getConfigPath,
  loadConfig,
  redactedConfig,
  saveConfig
} from "./chunk-P6VFMSPM.js";
import "./chunk-PDX44BCA.js";

// src/setup/wizard.ts
import {
  intro,
  outro,
  select,
  text,
  password,
  note,
  cancel,
  isCancel,
  spinner
} from "@clack/prompts";
import { generatePrivateKey } from "viem/accounts";
function bail(value) {
  cancel("Setup cancelled.");
  process.exit(0);
}
function check(value) {
  if (isCancel(value)) bail(value);
  return value;
}
function clientSnippet(client) {
  const entry = `"moly": { "command": "npx", "args": ["@moly-mcp/lido", "--server"] }`;
  switch (client) {
    case "claude-desktop":
      return `Add to ~/Library/Application Support/Claude/claude_desktop_config.json
(macOS) or %APPDATA%\\Claude\\claude_desktop_config.json (Windows):

{
  "mcpServers": {
    ${entry}
  }
}`;
    case "cursor":
      return `Add to ~/.cursor/mcp.json (global) or .cursor/mcp.json (project):

{
  "mcpServers": {
    ${entry}
  }
}`;
    case "windsurf":
      return `Add to ~/.codeium/windsurf/mcp_config.json:

{
  "mcpServers": {
    ${entry}
  }
}`;
    default:
      return null;
  }
}
var CLAUDE_MODELS = [
  { value: "claude-sonnet-4-6", label: "claude-sonnet-4-6  (fast, capable \u2014 recommended)" },
  { value: "claude-opus-4-6", label: "claude-opus-4-6    (most capable)" },
  { value: "claude-haiku-4-5-20251001", label: "claude-haiku-4-5-20251001  (fastest, cheapest)" },
  { value: "__custom__", label: "Enter custom model ID" }
];
var GEMINI_MODELS = [
  { value: "gemini-2.0-flash", label: "gemini-2.0-flash  (fast, recommended)" },
  { value: "gemini-1.5-pro", label: "gemini-1.5-pro    (capable)" },
  { value: "gemini-1.5-flash", label: "gemini-1.5-flash  (fast)" },
  { value: "__custom__", label: "Enter custom model ID" }
];
var OPENROUTER_MODELS = [
  { value: "nvidia/nemotron-3-super-120b-a12b:free", label: "nvidia/nemotron-3-super-120b-a12b:free  (default, free)" },
  { value: "anthropic/claude-sonnet-4-6", label: "anthropic/claude-sonnet-4-6" },
  { value: "anthropic/claude-opus-4-6", label: "anthropic/claude-opus-4-6" },
  { value: "google/gemini-2.0-flash", label: "google/gemini-2.0-flash" },
  { value: "openai/gpt-4o", label: "openai/gpt-4o" },
  { value: "__custom__", label: "Enter custom model ID (any OpenRouter slug)" }
];
async function pickModel(provider) {
  const models = provider === "anthropic" ? CLAUDE_MODELS : provider === "google" ? GEMINI_MODELS : OPENROUTER_MODELS;
  const picked = check(
    await select({
      message: "Model?",
      options: models
    })
  );
  if (picked === "__custom__") {
    return check(
      await text({ message: "Enter model ID:", placeholder: "provider/model-name" })
    );
  }
  return picked;
}
async function runWizard() {
  intro("  Moly  -  Lido MCP Server");
  const network = check(
    await select({
      message: "Which network?",
      options: [
        { value: "hoodi", label: "Hoodi Testnet  (chain 560048 \u2014 safe for testing)" },
        { value: "mainnet", label: "Ethereum Mainnet  (chain 1 \u2014 real assets)" }
      ]
    })
  );
  let chainScope = "ethereum";
  if (network === "mainnet") {
    chainScope = check(
      await select({
        message: "Chain scope?",
        options: [
          { value: "ethereum", label: "Ethereum only  (L1 staking, governance, wrapping)" },
          { value: "all", label: "All chains  (L1 + Base/Arbitrum bridging via LI.FI)" }
        ]
      })
    );
  }
  const rpcInput = check(
    await text({
      message: "Custom RPC URL?  (optional \u2014 leave blank to use public RPC)",
      placeholder: "https://..."
    })
  );
  const rpc = rpcInput?.trim() || null;
  const mode = check(
    await select({
      message: "Mode?",
      options: [
        { value: "simulation", label: "Simulation  (dry-run \u2014 estimates only, nothing sent)" },
        { value: "live", label: "Live  (real on-chain transactions)" }
      ]
    })
  );
  let privateKey = null;
  let ows = null;
  const keySource = check(
    await select({
      message: "Key source?  (needed for Live mode)",
      options: [
        { value: "ows", label: "OWS Wallet  (encrypted via Open Wallet Standard)" },
        { value: "raw", label: "Raw private key  (stored in ~/.moly/config.json, chmod 600)" },
        { value: "none", label: "None / Skip" }
      ]
    })
  );
  if (keySource === "ows") {
    let owsSdk = null;
    let wallets = [];
    try {
      const { createRequire } = await import("module");
      const _req = createRequire(import.meta.url);
      owsSdk = _req("@open-wallet-standard/core");
      wallets = owsSdk.listWallets();
    } catch {
      note("OWS SDK not found. Install it first:\ncurl -fsSL https://openwallet.sh/install.sh | bash\nnpm install @open-wallet-standard/core\nFalling back to raw key storage.", "OWS not available");
    }
    if (owsSdk && wallets.length > 0) {
      const walletName = check(
        await select({
          message: "Which OWS wallet?",
          options: wallets.map((w) => ({
            value: w.name,
            label: `${w.name}  (${w.address.slice(0, 8)}...)`
          }))
        })
      );
      const passphrase = check(
        await password({
          message: "OWS passphrase:",
          mask: "*"
        })
      );
      ows = { walletName, passphrase: passphrase.trim() };
    } else if (owsSdk && wallets.length === 0) {
      note("No OWS wallets found. Creating one for you...", "New OWS wallet");
      const walletName = check(
        await text({ message: "Wallet name:", placeholder: "moly", initialValue: "moly" })
      );
      const passphrase = check(
        await password({ message: "Set a passphrase (used to encrypt the key):", mask: "*" })
      );
      const s = spinner();
      s.start("Generating wallet...");
      try {
        const privateKey2 = generatePrivateKey();
        owsSdk.createWallet(walletName.trim() || "moly", passphrase.trim(), privateKey2);
        s.stop("Wallet created.");
        ows = { walletName: walletName.trim() || "moly", passphrase: passphrase.trim() };
      } catch (err) {
        s.stop("Auto-create failed: " + err.message);
        note("Falling back to raw private key storage.", "Fallback");
        const pk = check(
          await password({ message: "Enter or paste a private key (0x...) \u2014 or generate one:", mask: "*" })
        );
        privateKey = pk.trim() || null;
      }
    }
  } else if (keySource === "raw") {
    const pk = check(
      await password({
        message: "Private key (0x...):",
        mask: "*"
      })
    );
    privateKey = pk.trim() || null;
  }
  const providerChoice = check(
    await select({
      message: "AI Provider?  (optional \u2014 used for built-in chat + config snippet)",
      options: [
        { value: "openrouter", label: "OpenRouter  (access any model with one key)" },
        { value: "anthropic", label: "Anthropic  (Claude)" },
        { value: "google", label: "Google  (Gemini)" },
        { value: "none", label: "None / Skip" }
      ]
    })
  );
  let ai = null;
  if (providerChoice !== "none") {
    const provider = providerChoice;
    const apiKey = check(
      await password({
        message: "API Key:",
        mask: "*"
      })
    );
    const model = await pickModel(provider);
    ai = { provider, apiKey: apiKey.trim(), model };
  }
  const clientChoice = check(
    await select({
      message: "Which AI client are you using?  (for config snippet)",
      options: [
        { value: "Integrated Terminal", label: "Moly Environment" },
        { value: "claude-desktop", label: "Claude Desktop" },
        { value: "cursor", label: "Cursor" },
        { value: "windsurf", label: "Windsurf / Codeium" }
      ]
    })
  );
  const cfg = {
    network,
    mode,
    rpc,
    privateKey,
    ows,
    ai,
    chainScope,
    setupComplete: true
  };
  saveConfig(cfg);
  note(`Config saved \u2192 ${getConfigPath()}`, "Saved");
  const snippet = clientSnippet(clientChoice);
  if (snippet) {
    note(snippet, "Add to your AI client config");
  }
  const terminalMode = ai !== null && clientChoice === "Integrated Terminal";
  if (terminalMode) {
    outro(`Launching Moly Terminal...  ${mode} \xB7 ${network} \xB7 ready`);
  } else {
    outro(`Starting Moly MCP Server...  ${mode} \xB7 ${network} \xB7 ready`);
  }
  return { cfg, terminalMode };
}

// src/bin.ts
var args = process.argv.slice(2);
var command = args[0];
async function startServer() {
  await import("./server/index.js");
}
async function main() {
  switch (command) {
    // ── moly setup ────────────────────────────────────────────────────
    case "setup": {
      const { cfg, terminalMode } = await runWizard();
      if (terminalMode) {
        const { startChatSession } = await import("./session-ZIAXZNTD.js");
        await startChatSession(cfg);
      } else {
        await startServer();
      }
      break;
    }
    // ── moly config ───────────────────────────────────────────────────
    case "config": {
      if (!configExists()) {
        console.log("No config found. Run: npx @moly-mcp/lido");
        process.exit(1);
      }
      const cfg = loadConfig();
      console.log("\nMoly configuration (~/.moly/config.json):\n");
      console.log(JSON.stringify(redactedConfig(cfg), null, 2));
      console.log("\nTo change settings: moly setup");
      break;
    }
    // ── moly reset ────────────────────────────────────────────────────
    case "reset": {
      if (!configExists()) {
        console.log("No config found \u2014 nothing to reset.");
        process.exit(0);
      }
      deleteConfig();
      console.log("Config deleted. Run: npx @moly-mcp/lido  to set up again.");
      break;
    }
    // ── moly alert ─────────────────────────────────────────────────────
    case "alert": {
      const sub = args[1];
      const getFlag = (flag) => {
        const i = args.indexOf(flag);
        return i !== -1 ? args[i + 1] : void 0;
      };
      switch (sub) {
        case "add": {
          const condition = args[2];
          if (!condition) {
            console.log("Usage: moly alert add <condition> [threshold] [--channel webhook]");
            break;
          }
          const threshold = args[3] && !args[3].startsWith("-") ? parseFloat(args[3]) : void 0;
          const channel = getFlag("--channel") ?? "telegram";
          const { setAlert } = await import("./alerts-ARQAPRIT.js");
          const alert = setAlert({ condition, threshold, channel });
          console.log("Alert created:", JSON.stringify(alert, null, 2));
          break;
        }
        case "list": {
          const { listAlerts } = await import("./alerts-ARQAPRIT.js");
          console.log(JSON.stringify(listAlerts(), null, 2));
          break;
        }
        case "remove": {
          const id = args[2];
          if (!id) {
            console.log("Usage: moly alert remove <id>");
            break;
          }
          const { removeAlertById } = await import("./alerts-ARQAPRIT.js");
          console.log(JSON.stringify(removeAlertById(id), null, 2));
          break;
        }
        case "channels": {
          const { configureAlertChannels } = await import("./alerts-ARQAPRIT.js");
          const result = configureAlertChannels({
            telegram_token: getFlag("--telegram-token"),
            telegram_chat_id: getFlag("--telegram-chat"),
            webhook_url: getFlag("--webhook-url")
          });
          console.log("Channels configured:", JSON.stringify(result, null, 2));
          break;
        }
        case "daemon": {
          if (!configExists()) {
            console.log("No config. Run: moly setup");
            process.exit(1);
          }
          const { runDaemon } = await import("./daemon-RZA4HEUI.js");
          await runDaemon();
          break;
        }
        case "start": {
          const { spawn } = await import("child_process");
          const child = spawn(process.argv[0], [process.argv[1], "alert", "daemon"], {
            detached: true,
            stdio: "ignore"
          });
          child.unref();
          console.log(`Alert daemon started (PID: ${child.pid})`);
          break;
        }
        default:
          console.log("Usage: moly alert <add|list|remove|channels|daemon|start>");
      }
      break;
    }
    // ── moly monitor ──────────────────────────────────────────────────
    case "monitor": {
      const sub = args[1];
      switch (sub) {
        case "start": {
          const { spawn } = await import("child_process");
          const child = spawn(process.argv[0], [process.argv[1], "alert", "daemon"], {
            detached: true,
            stdio: "ignore"
          });
          child.unref();
          console.log(`Monitor daemon started (PID: ${child.pid})`);
          break;
        }
        case "status": {
          const { loadAlerts } = await import("./store-SKFUVSK4.js");
          const data = loadAlerts();
          if (!data.daemonPid) {
            console.log("No daemon running (or never started).");
          } else {
            let alive = false;
            try {
              process.kill(data.daemonPid, 0);
              alive = true;
            } catch {
            }
            console.log(`PID: ${data.daemonPid}  alive: ${alive}`);
            if (data.daemonStartedAt) console.log(`Started: ${data.daemonStartedAt}`);
            if (data.lastCheckAt) console.log(`Last check: ${data.lastCheckAt}`);
            console.log(`Active alerts: ${data.alerts.filter((a) => a.enabled).length}`);
          }
          break;
        }
        case "stop": {
          const { loadAlerts, saveAlerts } = await import("./store-SKFUVSK4.js");
          const data = loadAlerts();
          if (!data.daemonPid) {
            console.log("No daemon PID recorded.");
            break;
          }
          try {
            process.kill(data.daemonPid, "SIGTERM");
            console.log(`Sent SIGTERM to PID ${data.daemonPid}`);
          } catch {
            console.log(`PID ${data.daemonPid} not running.`);
          }
          data.daemonPid = void 0;
          saveAlerts(data);
          break;
        }
        default:
          console.log("Usage: moly monitor <start|status|stop>");
      }
      break;
    }
    // ── moly bounds ──────────────────────────────────────────────────
    case "bounds": {
      const sub = args[1];
      const getFlag = (flag) => {
        const i = args.indexOf(flag);
        return i !== -1 ? args[i + 1] : void 0;
      };
      switch (sub) {
        case "show":
        case void 0: {
          const { loadBounds } = await import("./store-5CEITPDY.js");
          console.log(JSON.stringify(loadBounds(), null, 2));
          break;
        }
        case "set": {
          const { loadBounds, saveBounds } = await import("./store-5CEITPDY.js");
          const b = loadBounds();
          const mst = getFlag("--max-stake-per-tx");
          const mds = getFlag("--max-daily-stake");
          const mer = getFlag("--min-eth-reserve");
          const art = getFlag("--auto-restake-threshold");
          const gov = getFlag("--governance-auto-vote");
          if (mst) b.maxStakePerTx = parseFloat(mst);
          if (mds) b.maxDailyStake = parseFloat(mds);
          if (mer) b.minEthReserve = parseFloat(mer);
          if (art) b.autoRestakeThreshold = parseFloat(art);
          if (gov) b.governanceAutoVote = gov === "true";
          saveBounds(b);
          console.log("Bounds updated:", JSON.stringify(b, null, 2));
          break;
        }
        case "reset": {
          const { resetBounds } = await import("./store-5CEITPDY.js");
          resetBounds();
          console.log("Bounds reset to defaults.");
          break;
        }
        default:
          console.log("Usage: moly bounds [show|set|reset]");
          console.log("  set flags: --max-stake-per-tx, --max-daily-stake, --min-eth-reserve, --auto-restake-threshold, --governance-auto-vote");
      }
      break;
    }
    // ── moly ledger ──────────────────────────────────────────────────
    case "ledger": {
      const sub = args[1];
      const getFlag = (flag) => {
        const i = args.indexOf(flag);
        return i !== -1 ? args[i + 1] : void 0;
      };
      const { initLedger, queryLedger, ledgerStats, exportLedger } = await import("./store-WRLUM7OW.js");
      initLedger();
      switch (sub) {
        case "list": {
          const tool = getFlag("--tool");
          const since = getFlag("--since");
          const limit = getFlag("--limit");
          const rows = queryLedger({ tool: tool ?? void 0, since: since ?? void 0, limit: limit ? parseInt(limit) : 50 });
          console.log(JSON.stringify(rows, null, 2));
          break;
        }
        case "stats": {
          const since = getFlag("--since");
          console.log(JSON.stringify(ledgerStats(since ?? void 0), null, 2));
          break;
        }
        case "export": {
          const format = getFlag("--format") ?? "json";
          console.log(exportLedger(format));
          break;
        }
        default:
          console.log("Usage: moly ledger <list|stats|export>");
          console.log("  list: --tool <name> --since <ISO date> --limit <n>");
          console.log("  export: --format <json|csv>");
      }
      break;
    }
    // ── moly position ────────────────────────────────────────────────
    case "position": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const { getTotalPosition } = await import("./position-ANCFIWD6.js");
      const address = args[1];
      const pos = await getTotalPosition(address);
      console.log(JSON.stringify(pos, null, 2));
      break;
    }
    // ── moly terminal — start chat session directly ───────────────────
    case "terminal": {
      if (!configExists()) {
        const { cfg, terminalMode } = await runWizard();
        if (terminalMode) {
          const { startChatSession } = await import("./session-ZIAXZNTD.js");
          await startChatSession(cfg);
        } else {
          await startServer();
        }
      } else {
        const cfg = loadConfig();
        const { startChatSession } = await import("./session-ZIAXZNTD.js");
        await startChatSession(cfg);
      }
      break;
    }
    // ── moly --server (force-start, used in AI client configs) ────────
    case "--server": {
      if (!configExists()) {
        process.stderr.write(
          "ERROR: No config found. Run: npx @moly-mcp/lido  to set up first.\n"
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
          const { startChatSession } = await import("./session-ZIAXZNTD.js");
          await startChatSession(cfg);
        } else {
          await startServer();
        }
      } else {
        const cfg = loadConfig();
        process.stderr.write(
          `@moly-mcp/lido \u2014 starting MCP server (${cfg.mode} \xB7 ${cfg.network})
`
        );
        await startServer();
      }
      break;
    }
  }
}
main().catch((err) => {
  process.stderr.write(`Error: ${err.message}
`);
  process.exit(1);
});
