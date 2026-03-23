#!/usr/bin/env node
import {
  getSettings,
  updateSettings
} from "../chunk-DD4OV6ZQ.js";
import {
  configureAlertChannels,
  listAlerts,
  removeAlertById,
  setAlert
} from "../chunk-CZ3EIJUF.js";
import {
  bridgeToEthereum,
  getBridgeQuote,
  getBridgeStatus,
  getL2Balance,
  getTotalPosition
} from "../chunk-HH4NH4N5.js";
import {
  loadBounds,
  saveBounds
} from "../chunk-CH4MXPWS.js";
import {
  initLedger,
  ledgerStats,
  queryLedger
} from "../chunk-RR74UAKD.js";
import "../chunk-6F64RPQQ.js";
import {
  getBalance,
  getRewards
} from "../chunk-2UMD5GE7.js";
import {
  stakeEth
} from "../chunk-E4XSJINX.js";
import {
  claimWithdrawals,
  getWithdrawalRequests,
  getWithdrawalStatus,
  requestWithdrawal
} from "../chunk-P66V3426.js";
import {
  getConversionRate,
  unwrapWsteth,
  wrapSteth
} from "../chunk-KS2ALUDE.js";
import {
  castVote,
  getProposal,
  getProposals
} from "../chunk-RVYPT5AF.js";
import "../chunk-2MF5MDUT.js";
import {
  loadConfig
} from "../chunk-P6VFMSPM.js";
import "../chunk-PDX44BCA.js";

// src/server/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
try {
  initLedger();
} catch {
}
var cfg = loadConfig();
var modeNote = cfg.mode === "simulation" ? "SIMULATION \u2014 dry_run true by default, no real transactions" : "LIVE \u2014 real transactions on " + (cfg.network === "mainnet" ? "Ethereum Mainnet" : "Hoodi Testnet");
var server = new McpServer({ name: "@moly-mcp/lido", version: "1.0.0" });
server.tool(
  "get_balance",
  `Get ETH, stETH, and wstETH balances for an address. ${modeNote}`,
  { address: z.string().optional().describe("Ethereum address (defaults to configured wallet)") },
  async ({ address }) => ({
    content: [{ type: "text", text: JSON.stringify(await getBalance(address), null, 2) }]
  })
);
server.tool(
  "get_rewards",
  "Get staking reward history for an address over N days.",
  {
    address: z.string().optional().describe("Ethereum address (defaults to configured wallet)"),
    days: z.number().int().min(1).max(365).optional().default(7).describe("Days to look back (1-365)")
  },
  async ({ address, days }) => ({
    content: [{ type: "text", text: JSON.stringify(await getRewards(address, days), null, 2) }]
  })
);
server.tool(
  "get_conversion_rate",
  "Get current stETH \u2194 wstETH conversion rates.",
  {},
  async () => ({
    content: [{ type: "text", text: JSON.stringify(await getConversionRate(), null, 2) }]
  })
);
server.tool(
  "stake_eth",
  `Stake ETH to receive stETH (liquid staking). ${modeNote}`,
  {
    amount_eth: z.string().describe('Amount of ETH to stake (e.g. "0.1")'),
    dry_run: z.boolean().optional().describe("Simulate without broadcasting. Always true in simulation mode unless explicitly false.")
  },
  async ({ amount_eth, dry_run }) => ({
    content: [{ type: "text", text: JSON.stringify(await stakeEth(amount_eth, dry_run), null, 2) }]
  })
);
server.tool(
  "request_withdrawal",
  `Request withdrawal of stETH back to ETH via the Lido queue. Min 0.1, max 1000 stETH per request. ${modeNote}`,
  {
    amount_steth: z.string().describe("Amount of stETH to withdraw"),
    dry_run: z.boolean().optional().describe("Simulate without broadcasting.")
  },
  async ({ amount_steth, dry_run }) => ({
    content: [{ type: "text", text: JSON.stringify(await requestWithdrawal(amount_steth, dry_run), null, 2) }]
  })
);
server.tool(
  "claim_withdrawals",
  `Claim finalized withdrawal requests and receive ETH. ${modeNote}`,
  {
    request_ids: z.array(z.string()).describe("Withdrawal request NFT IDs to claim"),
    dry_run: z.boolean().optional().describe("Simulate without broadcasting.")
  },
  async ({ request_ids, dry_run }) => ({
    content: [{ type: "text", text: JSON.stringify(await claimWithdrawals(request_ids, dry_run), null, 2) }]
  })
);
server.tool(
  "get_withdrawal_requests",
  "Get all pending withdrawal request IDs for an address.",
  { address: z.string().optional().describe("Ethereum address (defaults to configured wallet)") },
  async ({ address }) => ({
    content: [{ type: "text", text: JSON.stringify(await getWithdrawalRequests(address), null, 2) }]
  })
);
server.tool(
  "get_withdrawal_status",
  "Check finalization status of withdrawal request IDs. Must be finalized before claiming.",
  { request_ids: z.array(z.string()).describe("Withdrawal request IDs to check") },
  async ({ request_ids }) => ({
    content: [{ type: "text", text: JSON.stringify(await getWithdrawalStatus(request_ids), null, 2) }]
  })
);
server.tool(
  "wrap_steth",
  `Wrap stETH into wstETH (non-rebasing, better for DeFi). ${modeNote}`,
  {
    amount_steth: z.string().describe("Amount of stETH to wrap"),
    dry_run: z.boolean().optional().describe("Simulate without broadcasting.")
  },
  async ({ amount_steth, dry_run }) => ({
    content: [{ type: "text", text: JSON.stringify(await wrapSteth(amount_steth, dry_run), null, 2) }]
  })
);
server.tool(
  "unwrap_wsteth",
  `Unwrap wstETH back to rebasing stETH. ${modeNote}`,
  {
    amount_wsteth: z.string().describe("Amount of wstETH to unwrap"),
    dry_run: z.boolean().optional().describe("Simulate without broadcasting.")
  },
  async ({ amount_wsteth, dry_run }) => ({
    content: [{ type: "text", text: JSON.stringify(await unwrapWsteth(amount_wsteth, dry_run), null, 2) }]
  })
);
server.tool(
  "get_proposals",
  "List recent Lido DAO governance proposals from the Aragon Voting contract.",
  { count: z.number().int().min(1).max(20).optional().default(5).describe("Number of recent proposals to fetch") },
  async ({ count }) => ({
    content: [{ type: "text", text: JSON.stringify(await getProposals(count), null, 2) }]
  })
);
server.tool(
  "get_proposal",
  "Get detailed info on a specific Lido DAO governance proposal.",
  { proposal_id: z.number().int().describe("Proposal/vote ID") },
  async ({ proposal_id }) => ({
    content: [{ type: "text", text: JSON.stringify(await getProposal(proposal_id), null, 2) }]
  })
);
server.tool(
  "cast_vote",
  `Vote YEA or NAY on a Lido DAO governance proposal. Requires LDO tokens at snapshot block. ${modeNote}`,
  {
    proposal_id: z.number().int().describe("Proposal/vote ID"),
    support: z.boolean().describe("true = YEA (support), false = NAY (against)"),
    dry_run: z.boolean().optional().describe("Simulate without broadcasting.")
  },
  async ({ proposal_id, support, dry_run }) => ({
    content: [{ type: "text", text: JSON.stringify(await castVote(proposal_id, support, dry_run), null, 2) }]
  })
);
server.tool(
  "get_wallet",
  "Get the configured wallet public address.",
  {},
  async () => {
    const addr = rt.getAddress();
    return { content: [{ type: "text", text: JSON.stringify({ address: addr }, null, 2) }] };
  }
);
server.tool(
  "get_settings",
  "Get current Moly configuration \u2014 mode, network, RPC, and AI provider. Private key and API keys are never exposed.",
  {},
  async () => ({
    content: [{ type: "text", text: JSON.stringify(getSettings(), null, 2) }]
  })
);
server.tool(
  "update_settings",
  "Change mode, network, RPC, or AI model mid-conversation. Changes persist to ~/.moly/config.json. Private key and API keys cannot be changed here \u2014 use: moly setup",
  {
    network: z.enum(["hoodi", "mainnet"]).optional().describe("Switch network"),
    mode: z.enum(["simulation", "live"]).optional().describe("Switch between simulation (dry-run) and live mode"),
    rpc: z.string().nullable().optional().describe("Set custom RPC URL, or null to use default public RPC"),
    model: z.string().optional().describe("Change the AI model (if AI provider is configured)")
  },
  async ({ network, mode, rpc, model }) => ({
    content: [{ type: "text", text: JSON.stringify(updateSettings({ network, mode, rpc, model }), null, 2) }]
  })
);
server.tool(
  "set_alert",
  "Create a new alert. Conditions: balance_below, balance_above, reward_rate_below, reward_rate_above, withdrawal_ready, proposal_new, conversion_rate_above, conversion_rate_below. Default channel: telegram.",
  {
    condition: z.string().describe("Alert condition type"),
    threshold: z.number().optional().describe("Numeric threshold (required for _above/_below conditions)"),
    channel: z.enum(["telegram", "webhook"]).optional().default("telegram").describe("Notification channel")
  },
  async ({ condition, threshold, channel }) => ({
    content: [{ type: "text", text: JSON.stringify(setAlert({ condition, threshold, channel }), null, 2) }]
  })
);
server.tool(
  "list_alerts",
  "List all configured alerts.",
  {},
  async () => ({
    content: [{ type: "text", text: JSON.stringify(listAlerts(), null, 2) }]
  })
);
server.tool(
  "remove_alert",
  "Remove an alert by ID.",
  { id: z.string().describe("Alert ID to remove") },
  async ({ id }) => ({
    content: [{ type: "text", text: JSON.stringify(removeAlertById(id), null, 2) }]
  })
);
server.tool(
  "configure_alert_channels",
  "Configure Telegram and/or webhook notification channels for alerts.",
  {
    telegram_token: z.string().optional().describe("Telegram bot token"),
    telegram_chat_id: z.string().optional().describe("Telegram chat ID"),
    webhook_url: z.string().optional().describe("Webhook URL for HTTP POST notifications")
  },
  async ({ telegram_token, telegram_chat_id, webhook_url }) => ({
    content: [{ type: "text", text: JSON.stringify(configureAlertChannels({ telegram_token, telegram_chat_id, webhook_url }), null, 2) }]
  })
);
server.tool(
  "get_total_position",
  "Aggregated cross-chain position: ETH, stETH, wstETH across Ethereum + Base + Arbitrum, converted to ETH equivalent.",
  { address: z.string().optional().describe("Ethereum address (defaults to configured wallet)") },
  async ({ address }) => ({
    content: [{ type: "text", text: JSON.stringify(await getTotalPosition(address), null, 2) }]
  })
);
server.tool(
  "get_bounds",
  "Get current policy bounds (max stake per tx, daily limit, min ETH reserve, governance auto-vote).",
  {},
  async () => ({
    content: [{ type: "text", text: JSON.stringify(loadBounds(), null, 2) }]
  })
);
server.tool(
  "set_bounds",
  "Update policy bounds that gate write operations.",
  {
    maxStakePerTx: z.number().optional().describe("Max ETH per single stake"),
    maxDailyStake: z.number().optional().describe("Max ETH staked per day"),
    minEthReserve: z.number().optional().describe("Min ETH to keep unstaked for gas"),
    autoRestakeThreshold: z.number().optional().describe("Auto-restake rewards threshold"),
    governanceAutoVote: z.boolean().optional().describe("Allow agent to auto-vote")
  },
  async (patch) => {
    const current = loadBounds();
    if (patch.maxStakePerTx !== void 0) current.maxStakePerTx = patch.maxStakePerTx;
    if (patch.maxDailyStake !== void 0) current.maxDailyStake = patch.maxDailyStake;
    if (patch.minEthReserve !== void 0) current.minEthReserve = patch.minEthReserve;
    if (patch.autoRestakeThreshold !== void 0) current.autoRestakeThreshold = patch.autoRestakeThreshold;
    if (patch.governanceAutoVote !== void 0) current.governanceAutoVote = patch.governanceAutoVote;
    saveBounds(current);
    return { content: [{ type: "text", text: JSON.stringify(current, null, 2) }] };
  }
);
server.tool(
  "get_l2_balance",
  "Get ETH and wstETH balances on Base or Arbitrum. Mainnet only. Use this before bridging to check available funds.",
  {
    source_chain: z.enum(["base", "arbitrum"]).describe("L2 chain to query"),
    address: z.string().optional().describe("Address to check (defaults to configured wallet)")
  },
  async ({ source_chain, address }) => ({
    content: [{ type: "text", text: JSON.stringify(await getL2Balance(source_chain, address), null, 2) }]
  })
);
server.tool(
  "get_bridge_quote",
  "Get a quote for bridging ETH or wstETH from an L2 to Ethereum L1 via LI.FI. Mainnet only. Requires a configured wallet address.",
  {
    source_chain: z.enum(["base", "arbitrum"]).describe("L2 to bridge from"),
    token: z.enum(["ETH", "wstETH"]).describe("Token to bridge"),
    amount: z.string().describe('Amount to bridge (e.g. "0.1")'),
    to_token: z.enum(["ETH", "wstETH"]).optional().describe("Token to receive on L1 (default ETH)")
  },
  async ({ source_chain, token, amount, to_token }) => ({
    content: [{ type: "text", text: JSON.stringify(await getBridgeQuote(source_chain, token, amount, to_token), null, 2) }]
  })
);
server.tool(
  "bridge_to_ethereum",
  "Bridge ETH or wstETH from Base/Arbitrum to Ethereum L1 via LI.FI. Mainnet only. Requires a private key. In simulation mode this returns a quote without broadcasting.",
  {
    source_chain: z.enum(["base", "arbitrum"]).describe("L2 to bridge from"),
    token: z.enum(["ETH", "wstETH"]).describe("Token to bridge"),
    amount: z.string().describe("Amount to bridge"),
    to_token: z.enum(["ETH", "wstETH"]).optional().describe("Token to receive on L1 (default ETH)"),
    dry_run: z.boolean().optional().describe("Simulate without broadcasting")
  },
  async ({ source_chain, token, amount, to_token, dry_run }) => ({
    content: [{ type: "text", text: JSON.stringify(await bridgeToEthereum(source_chain, token, amount, to_token, dry_run), null, 2) }]
  })
);
server.tool(
  "get_bridge_status",
  "Check the status of an in-progress bridge transaction. Mainnet only. Use the tx hash returned by bridge_to_ethereum.",
  {
    tx_hash: z.string().describe("Bridge transaction hash on the L2"),
    source_chain: z.enum(["base", "arbitrum"]).describe("L2 the bridge was sent from")
  },
  async ({ tx_hash, source_chain }) => ({
    content: [{ type: "text", text: JSON.stringify(await getBridgeStatus(tx_hash, source_chain), null, 2) }]
  })
);
server.tool(
  "get_trade_history",
  "Query the activity ledger with filters.",
  {
    tool: z.string().optional().describe("Filter by tool name (e.g. stake_eth)"),
    since: z.string().optional().describe("ISO date to filter from"),
    limit: z.number().int().optional().default(50).describe("Max results")
  },
  async (opts) => ({
    content: [{ type: "text", text: JSON.stringify(queryLedger(opts), null, 2) }]
  })
);
server.tool(
  "get_staking_summary",
  "Aggregate stats from the activity ledger: total operations, staked ETH, errors.",
  { since: z.string().optional().describe("ISO date to filter from") },
  async ({ since }) => ({
    content: [{ type: "text", text: JSON.stringify(ledgerStats(since), null, 2) }]
  })
);
var transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`@moly-mcp/lido MCP server started \u2014 ${modeNote}
`);
