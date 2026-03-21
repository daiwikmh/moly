#!/usr/bin/env node
import {
  addAlert,
  loadAlerts,
  loadChannelConfig,
  removeAlert,
  saveChannelConfig
} from "./chunk-LMW24A22.js";

// src/tools/alerts.ts
var VALID_CONDITIONS = [
  "balance_below",
  "balance_above",
  "reward_rate_below",
  "reward_rate_above",
  "withdrawal_ready",
  "proposal_new",
  "conversion_rate_above",
  "conversion_rate_below",
  "reward_delta",
  "governance_expiring"
];
var NEEDS_THRESHOLD = /* @__PURE__ */ new Set([
  "balance_below",
  "balance_above",
  "reward_rate_below",
  "reward_rate_above",
  "conversion_rate_above",
  "conversion_rate_below",
  "reward_delta"
]);
function setAlert(params) {
  const condition = params.condition;
  if (!VALID_CONDITIONS.includes(condition)) {
    throw new Error(`Invalid condition: ${params.condition}. Valid: ${VALID_CONDITIONS.join(", ")}`);
  }
  if (NEEDS_THRESHOLD.has(condition) && params.threshold === void 0) {
    throw new Error(`Condition "${condition}" requires a threshold value`);
  }
  const channel = params.channel ?? "telegram";
  if (channel !== "telegram" && channel !== "webhook") {
    throw new Error(`Invalid channel: ${params.channel}. Valid: telegram, webhook`);
  }
  return addAlert({ condition, threshold: params.threshold, channel });
}
function listAlerts() {
  return loadAlerts();
}
function removeAlertById(id) {
  const removed = removeAlert(id);
  return { removed, id };
}
function configureAlertChannels(params) {
  const current = loadChannelConfig();
  if (params.telegram_token && params.telegram_chat_id) {
    current.telegram = { token: params.telegram_token, chatId: params.telegram_chat_id };
  }
  if (params.webhook_url) {
    current.webhook = { url: params.webhook_url };
  }
  saveChannelConfig(current);
  return {
    telegram: current.telegram ? { chatId: current.telegram.chatId, token: "*** configured" } : void 0,
    webhook: current.webhook ? { url: current.webhook.url } : void 0
  };
}

export {
  setAlert,
  listAlerts,
  removeAlertById,
  configureAlertChannels
};
