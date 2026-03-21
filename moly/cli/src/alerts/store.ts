import { existsSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { loadConfig, updateConfig } from '../config/store.js';
import type { AlertChannelConfig } from '../config/types.js';
import type { Alert, AlertsFile, AlertChannel, AlertConditionType } from './types.js';

const ALERTS_PATH = join(homedir(), '.moly', 'alerts.json');

export function loadAlerts(): AlertsFile {
  if (!existsSync(ALERTS_PATH)) return { alerts: [] };
  try {
    return JSON.parse(readFileSync(ALERTS_PATH, 'utf-8')) as AlertsFile;
  } catch {
    return { alerts: [] };
  }
}

export function saveAlerts(data: AlertsFile): void {
  writeFileSync(ALERTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  try { chmodSync(ALERTS_PATH, 0o600); } catch { /* non-POSIX */ }
}

export function addAlert(params: {
  condition: AlertConditionType;
  threshold?: number;
  channel?: AlertChannel;
}): Alert {
  const data = loadAlerts();
  const alert: Alert = {
    id: randomUUID(),
    condition: params.condition,
    threshold: params.threshold,
    channel: params.channel ?? 'telegram',
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  data.alerts.push(alert);
  saveAlerts(data);
  return alert;
}

export function removeAlert(id: string): boolean {
  const data = loadAlerts();
  const before = data.alerts.length;
  data.alerts = data.alerts.filter((a) => a.id !== id);
  if (data.alerts.length === before) return false;
  saveAlerts(data);
  return true;
}

export function loadChannelConfig(): AlertChannelConfig {
  const cfg = loadConfig();
  return cfg.alertChannels ?? {};
}

export function saveChannelConfig(channels: AlertChannelConfig): void {
  updateConfig({ alertChannels: channels } as any);
}
