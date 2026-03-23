#!/usr/bin/env node
import {
  applySettingsUpdate
} from "./chunk-2MF5MDUT.js";
import {
  loadConfig,
  redactedConfig
} from "./chunk-P6VFMSPM.js";

// src/tools/settings.ts
function getSettings() {
  const cfg = loadConfig();
  return {
    ...redactedConfig(cfg),
    note: "Use update_settings to change mode, network, or rpc. Private key and API keys can only be changed via: moly setup"
  };
}
function updateSettings(patch) {
  if (Object.keys(patch).length === 0) {
    return { error: "No settings provided to update." };
  }
  const updated = applySettingsUpdate(patch);
  return {
    updated: true,
    changes: patch,
    current: redactedConfig(updated),
    note: "Settings saved and applied. SDK reinitialized with new config."
  };
}

export {
  getSettings,
  updateSettings
};
