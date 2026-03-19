#!/usr/bin/env node

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
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
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
    rpc: cfg.rpc ?? "(default public RPC)",
    privateKey: cfg.privateKey ? "*** configured" : "(not set)",
    ai: cfg.ai ? {
      provider: cfg.ai.provider,
      model: cfg.ai.model,
      apiKey: "*** configured"
    } : "(not configured)"
  };
}

export {
  configExists,
  loadConfig,
  saveConfig,
  deleteConfig,
  getConfigPath,
  redactedConfig
};
