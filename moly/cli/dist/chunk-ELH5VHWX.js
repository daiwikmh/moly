#!/usr/bin/env node
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/config/store.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
var CONFIG_DIR = join(homedir(), ".moly");
var CONFIG_PATH = join(CONFIG_DIR, "config.json");
function configExists() {
  return existsSync(CONFIG_PATH);
}
function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error("No config found. Run: npx @moly/lido  (or: moly setup)");
  }
  try {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    if (!cfg.chainScope) cfg.chainScope = "ethereum";
    if (!cfg.ows) cfg.ows = null;
    if (!cfg.alertChannels) cfg.alertChannels = null;
    return cfg;
  } catch {
    throw new Error(`Failed to parse config at ${CONFIG_PATH}. Run: moly reset`);
  }
}
function saveConfig(cfg) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
  try {
    chmodSync(CONFIG_PATH, 384);
  } catch {
  }
}
function updateConfig(partial) {
  const current = loadConfig();
  const next = { ...current, ...partial };
  saveConfig(next);
  return next;
}
function deleteConfig() {
  if (existsSync(CONFIG_PATH)) unlinkSync(CONFIG_PATH);
}
function getConfigPath() {
  return CONFIG_PATH;
}
function redactedConfig(cfg) {
  return {
    network: cfg.network,
    mode: cfg.mode,
    chainScope: cfg.chainScope ?? "ethereum",
    rpc: cfg.rpc ?? "(default public RPC)",
    privateKey: cfg.privateKey ? "*** configured" : "(not set)",
    ows: cfg.ows ? { walletName: cfg.ows.walletName, passphrase: "*** configured" } : "(not configured)",
    alertChannels: cfg.alertChannels ? {
      telegram: cfg.alertChannels.telegram ? { chatId: cfg.alertChannels.telegram.chatId, token: "*** configured" } : void 0,
      webhook: cfg.alertChannels.webhook ? { url: cfg.alertChannels.webhook.url } : void 0
    } : "(not configured)",
    ai: cfg.ai ? {
      provider: cfg.ai.provider,
      model: cfg.ai.model,
      apiKey: "*** configured"
    } : "(not configured)"
  };
}

export {
  __require,
  configExists,
  loadConfig,
  saveConfig,
  updateConfig,
  deleteConfig,
  getConfigPath,
  redactedConfig
};
