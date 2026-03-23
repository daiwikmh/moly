#!/usr/bin/env node
import {
  getSettings,
  updateSettings
} from "./chunk-DD4OV6ZQ.js";
import {
  configureAlertChannels,
  listAlerts,
  removeAlertById,
  setAlert
} from "./chunk-CZ3EIJUF.js";
import {
  bridgeToEthereum,
  getBridgeQuote,
  getBridgeStatus,
  getL2Balance,
  getTotalPosition
} from "./chunk-HH4NH4N5.js";
import {
  loadBounds,
  saveBounds
} from "./chunk-CH4MXPWS.js";
import {
  initLedger,
  ledgerStats,
  logEntry,
  queryLedger
} from "./chunk-RR74UAKD.js";
import "./chunk-6F64RPQQ.js";
import {
  getBalance,
  getRewards
} from "./chunk-2UMD5GE7.js";
import {
  stakeEth
} from "./chunk-E4XSJINX.js";
import {
  claimWithdrawals,
  getWithdrawalRequests,
  getWithdrawalStatus,
  requestWithdrawal
} from "./chunk-P66V3426.js";
import {
  getConversionRate,
  unwrapWsteth,
  wrapSteth
} from "./chunk-KS2ALUDE.js";
import {
  castVote,
  getProposal,
  getProposals
} from "./chunk-RVYPT5AF.js";
import "./chunk-2MF5MDUT.js";
import "./chunk-P6VFMSPM.js";
import "./chunk-PDX44BCA.js";

// src/chat/session.ts
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// src/chat/providers.ts
async function callAnthropic(apiKey, model, messages, tools) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      }))
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const content = data.content;
  const textBlock = content.find((b) => b.type === "text");
  const toolUseBlocks = content.filter((b) => b.type === "tool_use");
  return {
    text: textBlock?.text ?? null,
    toolCalls: toolUseBlocks.map((b) => ({
      id: b.id,
      name: b.name,
      args: b.input
    })),
    rawAssistantMessage: { role: "assistant", content }
  };
}
function anthropicToolResult(toolCallId, result) {
  return {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: toolCallId, content: result }]
  };
}
async function callOpenRouter(apiKey, model, messages, tools) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/daiwikmh/moly",
      "X-Title": "Moly - Lido MCP"
    },
    body: JSON.stringify({
      model,
      messages,
      tools: tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters }
      }))
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const msg = data.choices[0].message;
  return {
    text: msg.content ?? null,
    toolCalls: (msg.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments ?? "{}")
    })),
    rawAssistantMessage: { role: "assistant", content: msg.content, tool_calls: msg.tool_calls }
  };
}
async function callGemini(apiKey, model, messages, tools) {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: Array.isArray(m.content) ? m.content : [{ text: m.content }]
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents,
        tools: [{
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }))
        }]
      })
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const textPart = parts.find((p) => p.text);
  const fnCalls = parts.filter((p) => p.functionCall);
  return {
    text: textPart?.text ?? null,
    toolCalls: fnCalls.map((p, i) => ({
      id: `gemini-${i}`,
      name: p.functionCall.name,
      args: p.functionCall.args ?? {}
    })),
    rawAssistantMessage: {
      role: "model",
      parts
    }
  };
}
function geminiToolResult(toolCallId, name, result) {
  return {
    role: "user",
    content: [{ functionResponse: { name, response: { output: result } } }]
  };
}
async function callAi(provider, apiKey, model, messages, tools) {
  switch (provider) {
    case "anthropic":
      return callAnthropic(apiKey, model, messages, tools);
    case "openrouter":
      return callOpenRouter(apiKey, model, messages, tools);
    case "google":
      return callGemini(apiKey, model, messages, tools);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
function makeToolResultMessage(provider, toolCallId, toolName, result) {
  switch (provider) {
    case "anthropic":
      return anthropicToolResult(toolCallId, result);
    case "openrouter":
      return { role: "tool", content: result, ...{ tool_call_id: toolCallId } };
    case "google":
      return geminiToolResult(toolCallId, toolName, result);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// src/chat/tools.ts
var TOOL_DEFS = [
  {
    name: "get_balance",
    description: "Get ETH, stETH, and wstETH balances for an address.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address (optional, defaults to configured wallet)" }
      }
    }
  },
  {
    name: "get_rewards",
    description: "Get staking reward history for an address over N days.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address (optional)" },
        days: { type: "number", description: "Days to look back (1-365), default 7" }
      }
    }
  },
  {
    name: "get_conversion_rate",
    description: "Get current stETH \u2194 wstETH conversion rates.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "stake_eth",
    description: "Stake ETH to receive stETH (liquid staking).",
    parameters: {
      type: "object",
      required: ["amount_eth"],
      properties: {
        amount_eth: { type: "string", description: 'Amount of ETH to stake (e.g. "0.1")' },
        dry_run: { type: "boolean", description: "Simulate without broadcasting" }
      }
    }
  },
  {
    name: "request_withdrawal",
    description: "Request withdrawal of stETH back to ETH. Min 0.1, max 1000 stETH.",
    parameters: {
      type: "object",
      required: ["amount_steth"],
      properties: {
        amount_steth: { type: "string", description: "Amount of stETH to withdraw" },
        dry_run: { type: "boolean" }
      }
    }
  },
  {
    name: "claim_withdrawals",
    description: "Claim finalized withdrawal requests and receive ETH.",
    parameters: {
      type: "object",
      required: ["request_ids"],
      properties: {
        request_ids: { type: "array", items: { type: "string" }, description: "Withdrawal request NFT IDs" },
        dry_run: { type: "boolean" }
      }
    }
  },
  {
    name: "get_withdrawal_requests",
    description: "Get all pending withdrawal request IDs for an address.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address (optional)" }
      }
    }
  },
  {
    name: "get_withdrawal_status",
    description: "Check finalization status of withdrawal request IDs.",
    parameters: {
      type: "object",
      required: ["request_ids"],
      properties: {
        request_ids: { type: "array", items: { type: "string" } }
      }
    }
  },
  {
    name: "wrap_steth",
    description: "Wrap stETH into wstETH.",
    parameters: {
      type: "object",
      required: ["amount_steth"],
      properties: {
        amount_steth: { type: "string" },
        dry_run: { type: "boolean" }
      }
    }
  },
  {
    name: "unwrap_wsteth",
    description: "Unwrap wstETH back to stETH.",
    parameters: {
      type: "object",
      required: ["amount_wsteth"],
      properties: {
        amount_wsteth: { type: "string" },
        dry_run: { type: "boolean" }
      }
    }
  },
  {
    name: "get_proposals",
    description: "List recent Lido DAO governance proposals.",
    parameters: {
      type: "object",
      properties: {
        count: { type: "number", description: "Number of proposals (1-20, default 5)" }
      }
    }
  },
  {
    name: "get_proposal",
    description: "Get detailed info on a specific Lido DAO governance proposal.",
    parameters: {
      type: "object",
      required: ["proposal_id"],
      properties: {
        proposal_id: { type: "number" }
      }
    }
  },
  {
    name: "cast_vote",
    description: "Vote YEA or NAY on a Lido DAO governance proposal.",
    parameters: {
      type: "object",
      required: ["proposal_id", "support"],
      properties: {
        proposal_id: { type: "number" },
        support: { type: "boolean", description: "true = YEA, false = NAY" },
        dry_run: { type: "boolean" }
      }
    }
  },
  {
    name: "get_wallet",
    description: "Get the configured wallet public address.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "get_settings",
    description: "Get current Moly configuration.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "update_settings",
    description: "Change mode, network, RPC, or chain scope.",
    parameters: {
      type: "object",
      properties: {
        network: { type: "string", enum: ["hoodi", "mainnet"] },
        mode: { type: "string", enum: ["simulation", "live"] },
        rpc: { type: "string", nullable: true },
        model: { type: "string" },
        chain_scope: { type: "string", enum: ["ethereum", "all"], description: "ethereum = L1 only, all = L1 + Base/Arbitrum bridging" }
      }
    }
  },
  {
    name: "get_l2_balance",
    description: "Get ETH and wstETH balances on Base or Arbitrum L2. Mainnet only.",
    parameters: {
      type: "object",
      required: ["source_chain"],
      properties: {
        source_chain: { type: "string", enum: ["base", "arbitrum"], description: "L2 chain to query" },
        address: { type: "string", description: "Address to check (optional, defaults to wallet)" }
      }
    }
  },
  {
    name: "get_bridge_quote",
    description: "Get a quote for bridging ETH or wstETH from an L2 to Ethereum L1 via LI.FI. Mainnet only.",
    parameters: {
      type: "object",
      required: ["source_chain", "token", "amount"],
      properties: {
        source_chain: { type: "string", enum: ["base", "arbitrum"] },
        token: { type: "string", enum: ["ETH", "wstETH"], description: "Token to bridge" },
        amount: { type: "string", description: 'Amount to bridge (e.g. "0.1")' },
        to_token: { type: "string", enum: ["ETH", "wstETH"], description: "Token to receive on L1 (default ETH)" }
      }
    }
  },
  {
    name: "bridge_to_ethereum",
    description: "Bridge ETH or wstETH from Base/Arbitrum to Ethereum L1 via LI.FI. Mainnet only.",
    parameters: {
      type: "object",
      required: ["source_chain", "token", "amount"],
      properties: {
        source_chain: { type: "string", enum: ["base", "arbitrum"] },
        token: { type: "string", enum: ["ETH", "wstETH"] },
        amount: { type: "string", description: "Amount to bridge" },
        to_token: { type: "string", enum: ["ETH", "wstETH"] },
        dry_run: { type: "boolean", description: "Simulate without broadcasting" }
      }
    }
  },
  {
    name: "get_bridge_status",
    description: "Check the status of an in-progress bridge transaction. Mainnet only.",
    parameters: {
      type: "object",
      required: ["tx_hash", "source_chain"],
      properties: {
        tx_hash: { type: "string", description: "Bridge transaction hash on the L2" },
        source_chain: { type: "string", enum: ["base", "arbitrum"] }
      }
    }
  },
  {
    name: "set_alert",
    description: "Create a new alert. Conditions: balance_below, balance_above, reward_rate_below, reward_rate_above, withdrawal_ready, proposal_new, conversion_rate_above, conversion_rate_below.",
    parameters: {
      type: "object",
      required: ["condition"],
      properties: {
        condition: { type: "string", description: "Alert condition type" },
        threshold: { type: "number", description: "Numeric threshold (required for _above/_below conditions)" },
        channel: { type: "string", enum: ["telegram", "webhook"], description: "Notification channel (default: telegram)" }
      }
    }
  },
  {
    name: "list_alerts",
    description: "List all configured alerts.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "remove_alert",
    description: "Remove an alert by ID.",
    parameters: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string", description: "Alert ID to remove" } }
    }
  },
  {
    name: "configure_alert_channels",
    description: "Configure Telegram and/or webhook notification channels for alerts.",
    parameters: {
      type: "object",
      properties: {
        telegram_token: { type: "string", description: "Telegram bot token" },
        telegram_chat_id: { type: "string", description: "Telegram chat ID" },
        webhook_url: { type: "string", description: "Webhook URL for HTTP POST notifications" }
      }
    }
  },
  {
    name: "get_total_position",
    description: "Aggregated cross-chain position: ETH, stETH, wstETH across Ethereum + Base + Arbitrum, all converted to ETH equivalent.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Ethereum address (optional)" }
      }
    }
  },
  {
    name: "get_bounds",
    description: "Get current policy bounds (max stake per tx, daily limit, min ETH reserve, governance auto-vote).",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "set_bounds",
    description: "Update policy bounds that gate write operations.",
    parameters: {
      type: "object",
      properties: {
        maxStakePerTx: { type: "number", description: "Max ETH per single stake" },
        maxDailyStake: { type: "number", description: "Max ETH staked per day" },
        minEthReserve: { type: "number", description: "Min ETH to keep unstaked for gas" },
        autoRestakeThreshold: { type: "number", description: "Auto-restake rewards threshold in ETH" },
        governanceAutoVote: { type: "boolean", description: "Allow agent to auto-vote on proposals" }
      }
    }
  },
  {
    name: "get_trade_history",
    description: "Query the activity ledger with filters.",
    parameters: {
      type: "object",
      properties: {
        tool: { type: "string", description: "Filter by tool name (e.g. stake_eth)" },
        since: { type: "string", description: "ISO date to filter from (e.g. 2026-01-01)" },
        limit: { type: "number", description: "Max results (default 50)" }
      }
    }
  },
  {
    name: "get_staking_summary",
    description: "Aggregate stats from the activity ledger: total operations, staked ETH, errors.",
    parameters: {
      type: "object",
      properties: {
        since: { type: "string", description: "ISO date to filter from (optional)" }
      }
    }
  }
];
async function executeTool(name, args) {
  try {
    let result;
    switch (name) {
      case "get_balance":
        result = await getBalance(args.address);
        break;
      case "get_rewards":
        result = await getRewards(args.address, args.days);
        break;
      case "get_conversion_rate":
        result = await getConversionRate();
        break;
      case "stake_eth":
        result = await stakeEth(args.amount_eth, args.dry_run);
        break;
      case "request_withdrawal":
        result = await requestWithdrawal(args.amount_steth, args.dry_run);
        break;
      case "claim_withdrawals":
        result = await claimWithdrawals(args.request_ids, args.dry_run);
        break;
      case "get_withdrawal_requests":
        result = await getWithdrawalRequests(args.address);
        break;
      case "get_withdrawal_status":
        result = await getWithdrawalStatus(args.request_ids);
        break;
      case "wrap_steth":
        result = await wrapSteth(args.amount_steth, args.dry_run);
        break;
      case "unwrap_wsteth":
        result = await unwrapWsteth(args.amount_wsteth, args.dry_run);
        break;
      case "get_proposals":
        result = await getProposals(args.count);
        break;
      case "get_proposal":
        result = await getProposal(args.proposal_id);
        break;
      case "cast_vote":
        result = await castVote(args.proposal_id, args.support, args.dry_run);
        break;
      case "get_wallet": {
        const { getRuntime } = await import("./runtime-PGSRZ7YU.js");
        const addr = getRuntime().getAddress();
        result = { address: addr };
        break;
      }
      case "get_settings":
        result = getSettings();
        break;
      case "update_settings":
        result = updateSettings(args);
        break;
      case "get_l2_balance":
        result = await getL2Balance(args.source_chain, args.address);
        break;
      case "get_bridge_quote":
        result = await getBridgeQuote(args.source_chain, args.token, args.amount, args.to_token);
        break;
      case "bridge_to_ethereum":
        result = await bridgeToEthereum(args.source_chain, args.token, args.amount, args.to_token, args.dry_run);
        break;
      case "get_bridge_status":
        result = await getBridgeStatus(args.tx_hash, args.source_chain);
        break;
      case "set_alert":
        result = setAlert(args);
        break;
      case "list_alerts":
        result = listAlerts();
        break;
      case "remove_alert":
        result = removeAlertById(args.id);
        break;
      case "configure_alert_channels":
        result = configureAlertChannels(args);
        break;
      case "get_total_position":
        result = await getTotalPosition(args.address);
        break;
      case "get_bounds":
        result = loadBounds();
        break;
      case "set_bounds": {
        const current = loadBounds();
        const patch = args;
        if (patch.maxStakePerTx !== void 0) current.maxStakePerTx = patch.maxStakePerTx;
        if (patch.maxDailyStake !== void 0) current.maxDailyStake = patch.maxDailyStake;
        if (patch.minEthReserve !== void 0) current.minEthReserve = patch.minEthReserve;
        if (patch.autoRestakeThreshold !== void 0) current.autoRestakeThreshold = patch.autoRestakeThreshold;
        if (patch.governanceAutoVote !== void 0) current.governanceAutoVote = patch.governanceAutoVote;
        saveBounds(current);
        result = current;
        break;
      }
      case "get_trade_history":
        result = queryLedger({ tool: args.tool, since: args.since, limit: args.limit });
        break;
      case "get_staking_summary":
        result = ledgerStats(args.since);
        break;
      default:
        return `Unknown tool: ${name}`;
    }
    return JSON.stringify(result, null, 2);
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

// src/bounds/enforce.ts
var STAKE_TOOLS = /* @__PURE__ */ new Set(["stake_eth", "bridge_to_ethereum"]);
async function checkBounds(toolName, args) {
  const bounds = loadBounds();
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (bounds.lastResetDate !== today) {
    bounds.dailyStaked = 0;
    bounds.lastResetDate = today;
    saveBounds(bounds);
  }
  if (toolName === "cast_vote" && !bounds.governanceAutoVote) {
    return { allowed: false, reason: `Governance auto-vote is disabled. Set bounds: governanceAutoVote = true` };
  }
  if (STAKE_TOOLS.has(toolName)) {
    const amount = parseFloat(args.amount_eth ?? args.amount ?? "0");
    if (isNaN(amount) || amount <= 0) return { allowed: true };
    if (amount > bounds.maxStakePerTx) {
      return { allowed: false, reason: `Amount ${amount} ETH exceeds max per tx (${bounds.maxStakePerTx} ETH)` };
    }
    if (bounds.dailyStaked + amount > bounds.maxDailyStake) {
      return { allowed: false, reason: `Would exceed daily limit: staked today ${bounds.dailyStaked.toFixed(4)} + ${amount} > ${bounds.maxDailyStake} ETH` };
    }
    try {
      const bal = await getBalance();
      const ethBal = parseFloat(bal.balances.eth);
      if (ethBal - amount < bounds.minEthReserve) {
        return { allowed: false, reason: `Would leave only ${(ethBal - amount).toFixed(4)} ETH, below reserve of ${bounds.minEthReserve} ETH` };
      }
    } catch {
    }
  }
  return { allowed: true };
}
function recordStake(amount) {
  const bounds = loadBounds();
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (bounds.lastResetDate !== today) {
    bounds.dailyStaked = 0;
    bounds.lastResetDate = today;
  }
  bounds.dailyStaked += amount;
  saveBounds(bounds);
}

// src/chat/session.ts
var R = "\x1B[0m";
var B = "\x1B[1m";
var D = "\x1B[2m";
var CY = "\x1B[36m";
var GR = "\x1B[32m";
var YE = "\x1B[33m";
var BL = "\x1B[34m";
var RE = "\x1B[31m";
var MA = "\x1B[35m";
var LOGO = `
${CY}${B}  \u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557  \u2588\u2588\u2557   \u2588\u2588\u2557${R}
${CY}${B}  \u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551  \u255A\u2588\u2588\u2557 \u2588\u2588\u2554\u255D${R}
${CY}${B}  \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551   \u255A\u2588\u2588\u2588\u2588\u2554\u255D ${R}
${CY}${B}  \u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551    \u255A\u2588\u2588\u2554\u255D  ${R}
${CY}${B}  \u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551   ${R}
${CY}${B}  \u255A\u2550\u255D     \u255A\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D   ${R}
${D}              powered by Lido${R}
`;
function ln(text = "") {
  process.stdout.write(text + "\n");
}
function printResponse(text) {
  const lines = text.split("\n");
  const prefix = `${B}${GR}moly${R} \u203A `;
  const indent = "       ";
  ln();
  lines.forEach((line, i) => {
    process.stdout.write((i === 0 ? prefix : indent) + line + "\n");
  });
  ln();
}
function saveTrade(toolName, args, result) {
  try {
    let txHash;
    let amount;
    try {
      const parsed = JSON.parse(result);
      txHash = parsed.txHash ?? parsed.tx_hash;
      amount = args.amount_eth ?? args.amount_steth ?? args.amount;
    } catch {
    }
    logEntry({
      tool: toolName,
      args,
      result,
      tx_hash: txHash,
      amount,
      status: "ok"
    });
  } catch {
  }
}
function printBanner(cfg) {
  const modeLabel = cfg.mode === "simulation" ? `${YE}\u25CF SIMULATION${R}` : `${RE}\u25CF LIVE${R}`;
  ln(LOGO);
  ln(`  ${modeLabel}  ${D}${cfg.network}  \xB7  ${cfg.ai?.model ?? ""}${R}`);
  ln(`  ${D}type "exit" to quit${R}`);
  ln(`  ${D}${"\u2500".repeat(48)}${R}`);
  ln();
}
var WRITE_TOOLS = /* @__PURE__ */ new Set([
  "stake_eth",
  "request_withdrawal",
  "claim_withdrawals",
  "wrap_steth",
  "unwrap_wsteth",
  "cast_vote",
  "bridge_to_ethereum"
]);
async function startChatSession(cfg) {
  if (!cfg.ai) {
    ln(`${RE}No AI provider configured. Run: moly setup${R}`);
    process.exit(1);
  }
  try {
    initLedger();
  } catch {
  }
  const { provider, apiKey, model } = cfg.ai;
  let skillContext = "";
  try {
    const skillPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../lido.skill.md");
    if (fs.existsSync(skillPath)) {
      skillContext = fs.readFileSync(skillPath, "utf-8") + "\n\n";
    }
  } catch {
  }
  const messages = [
    {
      role: "user",
      content: skillContext + `You are Moly, a terminal assistant for Lido Finance on ${cfg.network}.
Mode: ${cfg.mode} (${cfg.mode === "simulation" ? "dry-run, nothing broadcast" : "LIVE - real on-chain transactions"}).
Chain scope: ${cfg.chainScope ?? "ethereum"}.

You can only do what your tools support: staking ETH, withdrawals, wrap/unwrap stETH/wstETH, balances, rewards, Lido DAO governance${cfg.chainScope === "all" ? ", and L2 bridging from Base/Arbitrum to Ethereum via LI.FI" : ""}.
${cfg.chainScope === "all" ? "If the user wants to stake ETH from Base or Arbitrum, first check their L2 balance with get_l2_balance, then bridge to Ethereum with bridge_to_ethereum, then after bridging completes use stake_eth. Bridge takes 1-20 min, tell user to check with get_bridge_status.\n" : ""}If asked about anything outside those tools (e.g. Lido Vaults, validators, node operators, DeFi integrations), say clearly and briefly that it is not supported.

OUTPUT FORMAT RULES (terminal, no markdown):
- Never use **bold**, _italic_, # headers, or backtick code blocks.
- Use plain dashes (-) for lists, one item per line.
- Use blank lines to separate sections or groups of information.
- For key/value data (balances, settings, etc.) use "  key: value" format, one per line.
- Keep prose concise. Lead with the answer, then details.
- For live transactions always confirm with the user first.`
    },
    {
      role: "assistant",
      content: `Ready. I'm Moly on ${cfg.network} in ${cfg.mode} mode. What would you like to do?`
    }
  ];
  printBanner(cfg);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => new Promise((resolve2, reject) => {
    rl.question(`${B}${BL}you${R} \u203A `, resolve2);
    rl.once("close", () => reject(new Error("closed")));
  });
  while (true) {
    let input;
    try {
      input = (await prompt()).trim();
    } catch {
      break;
    }
    if (!input) continue;
    if (input === "exit" || input === "quit") {
      ln(`${D}Goodbye.${R}`);
      rl.close();
      process.exit(0);
    }
    messages.push({ role: "user", content: input });
    try {
      while (true) {
        ln(`${D}  \u2699  thinking...${R}`);
        const response = await callAi(provider, apiKey, model, messages, TOOL_DEFS);
        messages.push(response.rawAssistantMessage);
        if (response.toolCalls.length > 0) {
          const toolResults = [];
          for (const tc of response.toolCalls) {
            ln(`${D}  \u21B3  ${MA}${tc.name}${R}${D} ${JSON.stringify(tc.args)}${R}`);
            if (WRITE_TOOLS.has(tc.name)) {
              try {
                const check = await checkBounds(tc.name, tc.args);
                if (!check.allowed) {
                  ln(`${RE}  \u2715  BLOCKED: ${check.reason}${R}`);
                  toolResults.push(makeToolResultMessage(provider, tc.id, tc.name, JSON.stringify({ blocked: true, reason: check.reason })));
                  continue;
                }
              } catch {
              }
            }
            const result = await executeTool(tc.name, tc.args);
            ln(`${D}     ${result.slice(0, 300)}${result.length > 300 ? "\u2026" : ""}${R}`);
            if (WRITE_TOOLS.has(tc.name)) {
              saveTrade(tc.name, tc.args, result);
              if (tc.name === "stake_eth" && tc.args.amount_eth) {
                try {
                  recordStake(parseFloat(tc.args.amount_eth));
                } catch {
                }
              }
            }
            toolResults.push(makeToolResultMessage(provider, tc.id, tc.name, result));
          }
          messages.push(...toolResults);
          if (response.text) {
            printResponse(response.text);
          }
          continue;
        }
        if (response.text) {
          printResponse(response.text);
        }
        break;
      }
    } catch (err) {
      ln(`${RE}Error: ${err.message}${R}`);
      messages.pop();
    }
  }
  rl.close();
}
export {
  startChatSession
};
