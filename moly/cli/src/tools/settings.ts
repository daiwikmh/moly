import { loadConfig, redactedConfig } from '../config/store.js';
import { applySettingsUpdate } from '../server/runtime.js';
import type { Network, Mode } from '../config/types.js';

export function getSettings() {
  const cfg = loadConfig();
  return {
    ...redactedConfig(cfg),
    note: 'Use update_settings to change mode, network, or rpc. Private key and API keys can only be changed via: moly setup',
  };
}

export function updateSettings(patch: {
  network?: Network;
  mode?: Mode;
  rpc?: string | null;
  model?: string;
}) {
  if (Object.keys(patch).length === 0) {
    return { error: 'No settings provided to update.' };
  }

  const updated = applySettingsUpdate(patch);

  return {
    updated: true,
    changes: patch,
    current: redactedConfig(updated),
    note: 'Settings saved and applied. SDK reinitialized with new config.',
  };
}
