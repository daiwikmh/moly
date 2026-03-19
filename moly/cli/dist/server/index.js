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
} from "../chunk-RE3UIDLV.js";
import {
  loadConfig
} from "../chunk-PIFEXJ56.js";

// src/server/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
var cfg = loadConfig();
var modeNote = cfg.mode === "simulation" ? "\u{1F7E1} SIMULATION \u2014 dry_run true by default, no real transactions" : "\u{1F534} LIVE \u2014 real transactions on " + (cfg.network === "mainnet" ? "Ethereum Mainnet" : "Hoodi Testnet");
var server = new McpServer({ name: "@moly/lido", version: "1.0.0" });
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
var transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`@moly/lido MCP server started \u2014 ${modeNote}
`);
