import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { MolyConfig } from './types.js';

const CONFIG_DIR = join(homedir(), '.moly');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export function configExists(): boolean {
  return existsSync(CONFIG_PATH);
}

export function loadConfig(): MolyConfig {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error('No config found. Run: npx @moly/lido  (or: moly setup)');
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as MolyConfig;
  } catch {
    throw new Error(`Failed to parse config at ${CONFIG_PATH}. Run: moly reset`);
  }
}

export function saveConfig(cfg: MolyConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  // Restrict to owner read/write only — private key lives here
  try { chmodSync(CONFIG_PATH, 0o600); } catch { /* non-POSIX systems */ }
}

export function updateConfig(partial: Partial<MolyConfig>): MolyConfig {
  const current = loadConfig();
  const next = { ...current, ...partial };
  saveConfig(next);
  return next;
}

export function deleteConfig(): void {
  if (existsSync(CONFIG_PATH)) unlinkSync(CONFIG_PATH);
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

/** Redacted view safe to print — never expose private key or api key */
export function redactedConfig(cfg: MolyConfig) {
  return {
    network: cfg.network,
    mode: cfg.mode,
    rpc: cfg.rpc ?? '(default public RPC)',
    privateKey: cfg.privateKey ? '*** configured' : '(not set)',
    ai: cfg.ai
      ? {
          provider: cfg.ai.provider,
          model: cfg.ai.model,
          apiKey: '*** configured',
        }
      : '(not configured)',
  };
}
