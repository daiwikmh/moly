#!/usr/bin/env node
import {
  configExists,
  deleteConfig,
  getConfigPath,
  loadConfig,
  redactedConfig,
  saveConfig
} from "./chunk-PIFEXJ56.js";

// src/setup/wizard.ts
import {
  intro,
  outro,
  select,
  text,
  password,
  confirm,
  note,
  cancel,
  isCancel
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
  const entry = `"moly": { "command": "npx", "args": ["@moly/lido", "--server"] }`;
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
  intro("  Moly \u2014 Lido MCP Server  \u2B21");
  const network = check(
    await select({
      message: "Which network?",
      options: [
        { value: "hoodi", label: "Hoodi Testnet  (chain 560048 \u2014 safe for testing)" },
        { value: "mainnet", label: "Ethereum Mainnet  (chain 1 \u2014 real assets)" }
      ]
    })
  );
  const rpcInput = check(
    await text({
      message: "Custom RPC URL?  (optional \u2014 leave blank to use public RPC)",
      placeholder: "https://..."
    })
  );
  const rpc = rpcInput.trim() || null;
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
  const wantsKey = check(
    await confirm({
      message: "Add a private key?  (needed for Live mode \u2014 stored locally with chmod 600)",
      initialValue: mode === "live"
    })
  );
  if (wantsKey) {
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
        { value: "none", label: "None / Skip" },
        { value: "anthropic", label: "Anthropic  (Claude)" },
        { value: "google", label: "Google  (Gemini)" },
        { value: "openrouter", label: "OpenRouter  (access any model with one key)" }
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
        { value: "claude-desktop", label: "Claude Desktop" },
        { value: "cursor", label: "Cursor" },
        { value: "windsurf", label: "Windsurf / Codeium" },
        { value: "none", label: "Skip" }
      ]
    })
  );
  const cfg = {
    network,
    mode,
    rpc,
    privateKey,
    ai,
    setupComplete: true
  };
  saveConfig(cfg);
  note(`Config saved \u2192 ${getConfigPath()}`, "Saved");
  const snippet = clientSnippet(clientChoice);
  if (snippet) {
    note(snippet, "Add to your AI client config");
  }
  outro(`Starting Moly MCP Server...  ${mode} \xB7 ${network} \xB7 ready`);
  return cfg;
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
      await runWizard();
      await startServer();
      break;
    }
    // ── moly config ───────────────────────────────────────────────────
    case "config": {
      if (!configExists()) {
        console.log("No config found. Run: npx @moly/lido");
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
      console.log("Config deleted. Run: npx @moly/lido  to set up again.");
      break;
    }
    // ── moly --server (force-start, used in AI client configs) ────────
    case "--server": {
      if (!configExists()) {
        process.stderr.write(
          "ERROR: No config found. Run: npx @moly/lido  to set up first.\n"
        );
        process.exit(1);
      }
      await startServer();
      break;
    }
    // ── moly (no args) — wizard if first run, else start server ───────
    default: {
      if (!configExists()) {
        const cfg = await runWizard();
        await startServer();
      } else {
        const cfg = loadConfig();
        process.stderr.write(
          `@moly/lido \u2014 starting MCP server (${cfg.mode} \xB7 ${cfg.network})
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
