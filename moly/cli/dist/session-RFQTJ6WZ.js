#!/usr/bin/env node
import {
  castVote,
  claimWithdrawals,
  getBalance,
  getConversionRate,
  getProposal,
  getProposals,
  getRewards,
  getSettings,
  getWithdrawalRequests,
  getWithdrawalStatus,
  requestWithdrawal,
  stakeEth,
  unwrapWsteth,
  updateSettings,
  wrapSteth
} from "./chunk-RE3UIDLV.js";
import "./chunk-PIFEXJ56.js";

// src/chat/session.ts
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

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
    name: "get_settings",
    description: "Get current Moly configuration.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "update_settings",
    description: "Change mode, network, or RPC.",
    parameters: {
      type: "object",
      properties: {
        network: { type: "string", enum: ["hoodi", "mainnet"] },
        mode: { type: "string", enum: ["simulation", "live"] },
        rpc: { type: "string", nullable: true },
        model: { type: "string" }
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
      case "get_settings":
        result = getSettings();
        break;
      case "update_settings":
        result = updateSettings(args);
        break;
      default:
        return `Unknown tool: ${name}`;
    }
    return JSON.stringify(result, null, 2);
  } catch (err) {
    return `Error: ${err.message}`;
  }
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
${D}              powered by Lido \u2B21${R}
`;
function ln(text = "") {
  process.stdout.write(text + "\n");
}
function saveTrade(toolName, args, result) {
  try {
    const tradesDir = path.join(process.cwd(), "trades");
    if (!fs.existsSync(tradesDir)) fs.mkdirSync(tradesDir, { recursive: true });
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const file = path.join(tradesDir, `${today}.jsonl`);
    const record = JSON.stringify({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      tool: toolName,
      args,
      result: (() => {
        try {
          return JSON.parse(result);
        } catch {
          return result;
        }
      })()
    });
    fs.appendFileSync(file, record + "\n");
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
  "cast_vote"
]);
async function startChatSession(cfg) {
  if (!cfg.ai) {
    ln(`${RE}No AI provider configured. Run: moly setup${R}`);
    process.exit(1);
  }
  const { provider, apiKey, model } = cfg.ai;
  const messages = [
    {
      role: "user",
      content: `You are Moly, a terminal assistant for Lido Finance on ${cfg.network}. Mode: ${cfg.mode} (${cfg.mode === "simulation" ? "dry-run, nothing broadcast" : "LIVE - real on-chain transactions"}). You can only do what your tools support: staking ETH, withdrawals, wrap/unwrap stETH/wstETH, balances, rewards, and Lido DAO governance. If asked about anything outside those tools (e.g. Lido Vaults, validators, node operators, DeFi integrations), say clearly and briefly that it is not supported. IMPORTANT: This is a terminal. Never use markdown. No **bold**, no bullet points, no headers, no backticks. Plain text only. Be concise. For live transactions always confirm first.`
    },
    {
      role: "assistant",
      content: `Ready. I'm Moly on ${cfg.network} in ${cfg.mode} mode. What would you like to do?`
    }
  ];
  printBanner(cfg);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => new Promise((resolve, reject) => {
    rl.question(`${B}${BL}you${R} \u203A `, resolve);
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
            const result = await executeTool(tc.name, tc.args);
            ln(`${D}     ${result.slice(0, 300)}${result.length > 300 ? "\u2026" : ""}${R}`);
            if (WRITE_TOOLS.has(tc.name)) {
              saveTrade(tc.name, tc.args, result);
            }
            toolResults.push(makeToolResultMessage(provider, tc.id, tc.name, result));
          }
          messages.push(...toolResults);
          if (response.text) {
            ln();
            ln(`${B}${GR}moly${R} \u203A ${response.text}`);
            ln();
          }
          continue;
        }
        if (response.text) {
          ln();
          ln(`${B}${GR}moly${R} \u203A ${response.text}`);
          ln();
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
