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
    const { createRequire } = await import("module");
    const { homedir } = await import("os");
    const { join } = await import("path");
    const owsDir = join(homedir(), ".moly");
    const searchPaths = [
      () => createRequire(import.meta.url)("@open-wallet-standard/core"),
      () => createRequire(join(owsDir, "package.json"))("@open-wallet-standard/core"),
      () => createRequire(join(homedir(), ".nvm", "versions", "node", process.version, "lib", "node_modules", "package.json"))("@open-wallet-standard/core")
    ];
    for (const loader of searchPaths) {
      try {
        owsSdk = loader();
        break;
      } catch {
      }
    }
    if (!owsSdk) {
      const s = spinner();
      s.start("Installing @open-wallet-standard/core...");
      try {
        const { execSync } = await import("child_process");
        const { mkdirSync, existsSync, writeFileSync } = await import("fs");
        if (!existsSync(owsDir)) mkdirSync(owsDir, { recursive: true });
        if (!existsSync(join(owsDir, "package.json"))) {
          writeFileSync(join(owsDir, "package.json"), '{"name":"moly-deps","private":true}');
        }
        execSync("npm install @open-wallet-standard/core", { stdio: "pipe", cwd: owsDir });
        s.stop("OWS SDK installed.");
        owsSdk = createRequire(join(owsDir, "package.json"))("@open-wallet-standard/core");
      } catch (installErr) {
        s.stop("Auto-install failed: " + installErr.message);
        note("Could not install OWS SDK automatically.\nFalling back to raw key storage.", "OWS not available");
      }
    }
    if (owsSdk) {
      try {
        wallets = owsSdk.listWallets();
      } catch {
      }
    }
    if (owsSdk && wallets.length > 0) {
      const evmAddr = (w) => w.accounts?.find((a) => a.chainId === "evm")?.address ?? "";
      const walletAction = check(
        await select({
          message: "OWS wallet?",
          options: [
            ...wallets.map((w) => ({
              value: w.name,
              label: `${w.name}  (${evmAddr(w).slice(0, 10)}...)`
            })),
            { value: "__import__", label: "Import existing private key into new wallet" },
            { value: "__create__", label: "Create new wallet" }
          ]
        })
      );
      if (walletAction === "__import__" || walletAction === "__create__") {
        const wName = check(
          await text({ message: "Wallet name:", placeholder: "moly", initialValue: "moly" })
        );
        const pp = check(
          await password({ message: "Passphrase (encrypts the vault):", mask: "*" })
        );
        try {
          if (walletAction === "__import__") {
            const pk = check(
              await password({ message: "Private key (0x...):", mask: "*" })
            );
            owsSdk.importWalletPrivateKey(wName.trim() || "moly", pk.trim(), pp.trim() || void 0);
          } else {
            owsSdk.createWallet(wName.trim() || "moly", pp.trim() || void 0);
          }
          ows = { walletName: wName.trim() || "moly", passphrase: pp.trim() };
        } catch (err) {
          note("OWS operation failed: " + err.message + "\nFalling back to raw key.", "Fallback");
          const pk = check(
            await password({ message: "Private key (0x...):", mask: "*" })
          );
          const t = pk.trim();
          privateKey = t ? t.startsWith("0x") ? t : "0x" + t : null;
        }
      } else {
        const passphrase = check(
          await password({ message: "OWS passphrase:", mask: "*" })
        );
        ows = { walletName: walletAction, passphrase: passphrase.trim() };
      }
    } else if (owsSdk && wallets.length === 0) {
      const walletAction = check(
        await select({
          message: "No wallets found. What would you like to do?",
          options: [
            { value: "import", label: "Import existing private key" },
            { value: "create", label: "Generate new wallet" }
          ]
        })
      );
      const walletName = check(
        await text({ message: "Wallet name:", placeholder: "moly", initialValue: "moly" })
      );
      const passphrase = check(
        await password({ message: "Passphrase (encrypts the vault):", mask: "*" })
      );
      try {
        if (walletAction === "import") {
          const pk = check(
            await password({ message: "Private key (0x...):", mask: "*" })
          );
          owsSdk.importWalletPrivateKey(walletName.trim() || "moly", pk.trim(), passphrase.trim() || void 0);
        } else {
          owsSdk.createWallet(walletName.trim() || "moly", passphrase.trim() || void 0);
        }
        ows = { walletName: walletName.trim() || "moly", passphrase: passphrase.trim() };
      } catch (err) {
        note("OWS operation failed: " + err.message + "\nFalling back to raw key.", "Fallback");
        const pk = check(
          await password({ message: "Private key (0x...):", mask: "*" })
        );
        const t = pk.trim();
        privateKey = t ? t.startsWith("0x") ? t : "0x" + t : null;
      }
    }
  } else if (keySource === "raw") {
    const pk = check(
      await password({
        message: "Private key (0x...):",
        mask: "*"
      })
    );
    const trimmed = pk.trim();
    privateKey = trimmed ? trimmed.startsWith("0x") ? trimmed : "0x" + trimmed : null;
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
        const { startChatSession } = await import("./session-FKRDTPLS.js");
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
          const { setAlert } = await import("./alerts-WV24ME7Y.js");
          const alert = setAlert({ condition, threshold, channel });
          console.log("Alert created:", JSON.stringify(alert, null, 2));
          break;
        }
        case "list": {
          const { listAlerts } = await import("./alerts-WV24ME7Y.js");
          console.log(JSON.stringify(listAlerts(), null, 2));
          break;
        }
        case "remove": {
          const id = args[2];
          if (!id) {
            console.log("Usage: moly alert remove <id>");
            break;
          }
          const { removeAlertById } = await import("./alerts-WV24ME7Y.js");
          console.log(JSON.stringify(removeAlertById(id), null, 2));
          break;
        }
        case "channels": {
          const { configureAlertChannels } = await import("./alerts-WV24ME7Y.js");
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
          const { runDaemon } = await import("./daemon-DAY6WJCJ.js");
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
      const { getTotalPosition } = await import("./position-IA7ADOHU.js");
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
          const { startChatSession } = await import("./session-FKRDTPLS.js");
          await startChatSession(cfg);
        } else {
          await startServer();
        }
      } else {
        const cfg = loadConfig();
        const { startChatSession } = await import("./session-FKRDTPLS.js");
        await startChatSession(cfg);
      }
      break;
    }
    // ── moly --help / help / -h ─────────────────────────────────────────
    case "--help":
    case "-h":
    case "help": {
      console.log(`
moly \u2014 Lido MCP Server CLI

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
    case "--version":
    case "-v": {
      const { createRequire } = await import("module");
      const pkg = createRequire(import.meta.url)("../package.json");
      console.log(`@moly-mcp/lido v${pkg.version}`);
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
    // ── Direct tool commands ──────────────────────────────────────────
    case "balance": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const { getBalance } = await import("./balance-WQTVOX27.js");
      const addr = args[1];
      console.log(JSON.stringify(await getBalance(addr), null, 2));
      break;
    }
    case "rewards": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const { getRewards } = await import("./balance-WQTVOX27.js");
      const addr = args[1];
      const days = args[2] ? parseInt(args[2]) : 7;
      console.log(JSON.stringify(await getRewards(addr, days), null, 2));
      break;
    }
    case "stake": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const amount = args[1];
      if (!amount) {
        console.log("Usage: moly stake <amount> [--dry-run]");
        break;
      }
      const dryRun = args.includes("--dry-run");
      const { stakeEth } = await import("./stake-ZYFXR35T.js");
      console.log(JSON.stringify(await stakeEth(amount, dryRun), null, 2));
      break;
    }
    case "wrap": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const amount = args[1];
      if (!amount) {
        console.log("Usage: moly wrap <amount> [--dry-run]");
        break;
      }
      const dryRun = args.includes("--dry-run");
      const { wrapSteth } = await import("./wrap-67UFXAQW.js");
      console.log(JSON.stringify(await wrapSteth(amount, dryRun), null, 2));
      break;
    }
    case "unwrap": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const amount = args[1];
      if (!amount) {
        console.log("Usage: moly unwrap <amount> [--dry-run]");
        break;
      }
      const dryRun = args.includes("--dry-run");
      const { unwrapWsteth } = await import("./wrap-67UFXAQW.js");
      console.log(JSON.stringify(await unwrapWsteth(amount, dryRun), null, 2));
      break;
    }
    case "withdraw": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const amount = args[1];
      if (!amount) {
        console.log("Usage: moly withdraw <amount> [--dry-run]");
        break;
      }
      const dryRun = args.includes("--dry-run");
      const { requestWithdrawal } = await import("./unstake-D4K64YHK.js");
      console.log(JSON.stringify(await requestWithdrawal(amount, dryRun), null, 2));
      break;
    }
    case "claim": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const ids = args.slice(1).filter((a) => !a.startsWith("--"));
      if (!ids.length) {
        console.log("Usage: moly claim <id1> [id2...] [--dry-run]");
        break;
      }
      const dryRun = args.includes("--dry-run");
      const { claimWithdrawals } = await import("./unstake-D4K64YHK.js");
      console.log(JSON.stringify(await claimWithdrawals(ids, dryRun), null, 2));
      break;
    }
    case "withdrawals": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const addr = args[1];
      const { getWithdrawalRequests } = await import("./unstake-D4K64YHK.js");
      console.log(JSON.stringify(await getWithdrawalRequests(addr), null, 2));
      break;
    }
    case "proposals": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const count = args[1] ? parseInt(args[1]) : 5;
      const { getProposals } = await import("./governance-RKBUYAG3.js");
      console.log(JSON.stringify(await getProposals(count), null, 2));
      break;
    }
    case "proposal": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const id = args[1];
      if (!id) {
        console.log("Usage: moly proposal <id>");
        break;
      }
      const { getProposal } = await import("./governance-RKBUYAG3.js");
      console.log(JSON.stringify(await getProposal(parseInt(id)), null, 2));
      break;
    }
    case "vote": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const id = args[1];
      const side = args[2];
      if (!id || !side) {
        console.log("Usage: moly vote <proposal_id> <yea|nay> [--dry-run]");
        break;
      }
      const support = side.toLowerCase() === "yea" || side.toLowerCase() === "yes";
      const dryRun = args.includes("--dry-run");
      const { castVote } = await import("./governance-RKBUYAG3.js");
      console.log(JSON.stringify(await castVote(parseInt(id), support, dryRun), null, 2));
      break;
    }
    case "rate": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const { getConversionRate } = await import("./wrap-67UFXAQW.js");
      console.log(JSON.stringify(await getConversionRate(), null, 2));
      break;
    }
    case "wallet": {
      if (!configExists()) {
        console.log("No config. Run: moly setup");
        process.exit(1);
      }
      const { getRuntime } = await import("./runtime-PGSRZ7YU.js");
      try {
        console.log(getRuntime().getAddress());
      } catch (e) {
        console.log("No wallet configured:", e.message);
      }
      break;
    }
    // ── moly (no args) — wizard if first run, else start server ───────
    default: {
      if (!configExists()) {
        const { cfg, terminalMode } = await runWizard();
        if (terminalMode) {
          const { startChatSession } = await import("./session-FKRDTPLS.js");
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
