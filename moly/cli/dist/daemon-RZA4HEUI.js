#!/usr/bin/env node
import {
  getProposals,
  getWithdrawalRequests,
  getWithdrawalStatus
} from "./chunk-C7R33HEF.js";
import {
  loadAlerts,
  loadChannelConfig,
  saveAlerts
} from "./chunk-6F64RPQQ.js";
import {
  getBalance,
  getConversionRate,
  getRewards,
  getRuntime
} from "./chunk-WMGNTYBF.js";
import "./chunk-P6VFMSPM.js";
import "./chunk-PDX44BCA.js";

// src/alerts/notify.ts
async function sendTelegram(token, chatId, message) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" })
    });
    if (!res.ok) {
      process.stderr.write(`Telegram send failed (${res.status}): ${await res.text()}
`);
      return false;
    }
    return true;
  } catch (err) {
    process.stderr.write(`Telegram error: ${err.message}
`);
    return false;
  }
}
async function sendWebhook(url, payload) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      process.stderr.write(`Webhook send failed (${res.status})
`);
      return false;
    }
    return true;
  } catch (err) {
    process.stderr.write(`Webhook error: ${err.message}
`);
    return false;
  }
}
function formatTelegramMessage(alert, data2) {
  const lines = [
    "*Moly Alert*",
    "",
    `Condition: \`${alert.condition}\``
  ];
  if (alert.threshold !== void 0) lines.push(`Threshold: ${alert.threshold}`);
  if (data2.current !== void 0) lines.push(`Current: ${data2.current}`);
  if (data2.detail) lines.push(`Detail: ${data2.detail}`);
  lines.push(`Triggered: ${(/* @__PURE__ */ new Date()).toISOString()}`);
  return lines.join("\n");
}
async function dispatch(channelConfig, channel, alert, data2) {
  if (channel === "telegram") {
    const tg = channelConfig.telegram;
    if (!tg) {
      process.stderr.write("Telegram not configured\n");
      return false;
    }
    return sendTelegram(tg.token, tg.chatId, formatTelegramMessage(alert, data2));
  }
  if (channel === "webhook") {
    const wh = channelConfig.webhook;
    if (!wh) {
      process.stderr.write("Webhook not configured\n");
      return false;
    }
    return sendWebhook(wh.url, {
      alert: { id: alert.id, condition: alert.condition, threshold: alert.threshold },
      data: data2,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      source: "moly-alerts"
    });
  }
  return false;
}

// src/alerts/daemon.ts
var COOLDOWN_MS = 5 * 60 * 1e3;
async function evaluateAlert(alert, lastProposalCount) {
  try {
    switch (alert.condition) {
      case "balance_below":
      case "balance_above": {
        const res = await getBalance();
        const total = parseFloat(res.balances.eth) + parseFloat(res.balances.stETH) + parseFloat(res.balances.wstETH);
        const hit = alert.condition === "balance_below" ? total < (alert.threshold ?? 0) : total > (alert.threshold ?? 0);
        return { triggered: hit, data: { current: total.toFixed(6), balances: res.balances } };
      }
      case "reward_rate_below":
      case "reward_rate_above": {
        const res = await getRewards(void 0, 30);
        const rate = parseFloat(res.totalRewards);
        const hit = alert.condition === "reward_rate_below" ? rate < (alert.threshold ?? 0) : rate > (alert.threshold ?? 0);
        return { triggered: hit, data: { current: rate.toFixed(6), detail: `${res.totalRewards} ETH over 30d` } };
      }
      case "conversion_rate_above":
      case "conversion_rate_below": {
        const res = await getConversionRate();
        const rate = parseFloat(res["1_wstETH_in_stETH"]);
        const hit = alert.condition === "conversion_rate_above" ? rate > (alert.threshold ?? 0) : rate < (alert.threshold ?? 0);
        return { triggered: hit, data: { current: rate.toFixed(6) } };
      }
      case "withdrawal_ready": {
        const reqs = await getWithdrawalRequests();
        if (!reqs.requestIds?.length) return { triggered: false, data: { detail: "no pending withdrawals" } };
        const status = await getWithdrawalStatus(reqs.requestIds);
        const ready = (status.statuses ?? []).filter((s) => s.isFinalized);
        return {
          triggered: ready.length > 0,
          data: { current: ready.length, detail: `${ready.length} of ${reqs.requestIds.length} finalized` }
        };
      }
      case "proposal_new": {
        const res = await getProposals(1);
        const current = res.totalProposals ?? 0;
        if (lastProposalCount === void 0) {
          return { triggered: false, data: { detail: "tracking started" }, newProposalCount: current };
        }
        return {
          triggered: current > lastProposalCount,
          data: { current, detail: `${current - lastProposalCount} new proposal(s)` },
          newProposalCount: current
        };
      }
      case "reward_delta": {
        const res = await getBalance();
        const current = parseFloat(res.balances.stETH);
        const prev = data.lastRewardBalance ? parseFloat(data.lastRewardBalance) : current;
        const delta = current - prev;
        data.lastRewardBalance = current.toString();
        return {
          triggered: delta > (alert.threshold ?? 0),
          data: { delta: delta.toFixed(8), current: current.toFixed(6), previous: prev.toFixed(6) }
        };
      }
      case "governance_expiring": {
        const res = await getProposals(10);
        const now = Date.now();
        const soon = 24 * 60 * 60 * 1e3;
        const votingWindow = 72 * 60 * 60 * 1e3;
        const expiring = (res.proposals ?? []).filter(
          (p) => p.open && p.startDate && new Date(p.startDate).getTime() + votingWindow - now < soon
        );
        return {
          triggered: expiring.length > 0,
          data: { count: expiring.length, ids: expiring.map((p) => p.id) }
        };
      }
      default:
        return null;
    }
  } catch (err) {
    process.stderr.write(`Alert eval error [${alert.condition}]: ${err.message}
`);
    return null;
  }
}
async function runDaemon(intervalMs = 3e4) {
  getRuntime();
  const channelConfig = loadChannelConfig();
  process.stderr.write(`Alert daemon running, polling every ${intervalMs / 1e3}s
`);
  const initData = loadAlerts();
  initData.daemonPid = process.pid;
  initData.daemonStartedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveAlerts(initData);
  while (true) {
    const data2 = loadAlerts();
    const active = data2.alerts.filter((a) => a.enabled);
    for (const alert of active) {
      if (alert.lastTriggered) {
        const elapsed = Date.now() - new Date(alert.lastTriggered).getTime();
        if (elapsed < COOLDOWN_MS) continue;
      }
      const result = await evaluateAlert(alert, data2.lastProposalCount);
      if (!result) continue;
      if (result.newProposalCount !== void 0) {
        data2.lastProposalCount = result.newProposalCount;
      }
      if (result.triggered) {
        process.stderr.write(`Alert triggered: ${alert.condition} (${alert.id.slice(0, 8)})
`);
        await dispatch(channelConfig, alert.channel, alert, result.data);
        alert.lastTriggered = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
    data2.lastCheckAt = (/* @__PURE__ */ new Date()).toISOString();
    saveAlerts(data2);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
export {
  runDaemon
};
