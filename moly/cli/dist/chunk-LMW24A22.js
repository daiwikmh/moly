#!/usr/bin/env node
import {
  loadConfig,
  updateConfig
} from "./chunk-TJ66OXD4.js";

// src/alerts/store.ts
import { existsSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
var ALERTS_PATH = join(homedir(), ".moly", "alerts.json");
function loadAlerts() {
  if (!existsSync(ALERTS_PATH)) return { alerts: [] };
  try {
    return JSON.parse(readFileSync(ALERTS_PATH, "utf-8"));
  } catch {
    return { alerts: [] };
  }
}
function saveAlerts(data) {
  writeFileSync(ALERTS_PATH, JSON.stringify(data, null, 2), "utf-8");
  try {
    chmodSync(ALERTS_PATH, 384);
  } catch {
  }
}
function addAlert(params) {
  const data = loadAlerts();
  const alert = {
    id: randomUUID(),
    condition: params.condition,
    threshold: params.threshold,
    channel: params.channel ?? "telegram",
    enabled: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  data.alerts.push(alert);
  saveAlerts(data);
  return alert;
}
function removeAlert(id) {
  const data = loadAlerts();
  const before = data.alerts.length;
  data.alerts = data.alerts.filter((a) => a.id !== id);
  if (data.alerts.length === before) return false;
  saveAlerts(data);
  return true;
}
function loadChannelConfig() {
  const cfg = loadConfig();
  return cfg.alertChannels ?? {};
}
function saveChannelConfig(channels) {
  updateConfig({ alertChannels: channels });
}

export {
  loadAlerts,
  saveAlerts,
  addAlert,
  removeAlert,
  loadChannelConfig,
  saveChannelConfig
};
