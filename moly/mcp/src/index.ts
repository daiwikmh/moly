#!/usr/bin/env bun
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { config } from './config.js';
import { getBalance, getRewards } from './tools/balance.js';
import { stakeEth } from './tools/stake.js';
import { requestWithdrawal, claimWithdrawals, getWithdrawalRequests, getWithdrawalStatus } from './tools/unstake.js';
import { wrapSteth, unwrapWsteth, getConversionRate } from './tools/wrap.js';
import { getProposals, getProposal, castVote } from './tools/governance.js';
import { getL2Balance, getBridgeQuote, bridgeToEthereum, getBridgeStatus } from './tools/bridge.js';

const server = new McpServer({
  name: 'lido-mcp',
  version: '0.1.0',
});

const modeNote = config.isSimulation
  ? '🟡 SIMULATION MODE (Holesky) — write operations are dry_run by default'
  : '🔴 LIVE MODE (Mainnet) — real transactions will be broadcast';

// ── Balance & Info ──────────────────────────────────────────────

server.tool(
  'get_balance',
  `Get ETH, stETH, and wstETH balances for an address. Also returns current staking APR. ${modeNote}`,
  { address: z.string().optional().describe('Ethereum address (defaults to configured wallet)') },
  async ({ address }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getBalance(address), null, 2) }],
  })
);

server.tool(
  'get_rewards',
  'Get staking reward history for an address over N days.',
  {
    address: z.string().optional().describe('Ethereum address (defaults to configured wallet)'),
    days: z.number().int().min(1).max(365).optional().default(7).describe('Number of days to look back'),
  },
  async ({ address, days }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getRewards(address, days), null, 2) }],
  })
);

server.tool(
  'get_conversion_rate',
  'Get current stETH ↔ wstETH conversion rates.',
  {},
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(await getConversionRate(), null, 2) }],
  })
);

// ── Staking ─────────────────────────────────────────────────────

server.tool(
  'stake_eth',
  `Stake ETH to receive stETH. In simulation mode, dry_run defaults to true. ${modeNote}`,
  {
    amount_eth: z.string().describe('Amount of ETH to stake (e.g. "0.1")'),
    dry_run: z.boolean().optional().describe('Simulate without broadcasting. Always true in simulation mode unless set to false.'),
  },
  async ({ amount_eth, dry_run }) => ({
    content: [{ type: 'text', text: JSON.stringify(await stakeEth(amount_eth, dry_run), null, 2) }],
  })
);

// ── Unstaking / Withdrawals ──────────────────────────────────────

server.tool(
  'request_withdrawal',
  `Request withdrawal of stETH back to ETH via the Lido withdrawal queue. ${modeNote}`,
  {
    amount_steth: z.string().describe('Amount of stETH to withdraw (min 0.1, max 1000 per request)'),
    dry_run: z.boolean().optional().describe('Simulate without broadcasting.'),
  },
  async ({ amount_steth, dry_run }) => ({
    content: [{ type: 'text', text: JSON.stringify(await requestWithdrawal(amount_steth, dry_run), null, 2) }],
  })
);

server.tool(
  'claim_withdrawals',
  `Claim finalized withdrawal requests and receive ETH. ${modeNote}`,
  {
    request_ids: z.array(z.string()).describe('Array of withdrawal request NFT IDs to claim'),
    dry_run: z.boolean().optional().describe('Simulate without broadcasting.'),
  },
  async ({ request_ids, dry_run }) => ({
    content: [{ type: 'text', text: JSON.stringify(await claimWithdrawals(request_ids, dry_run), null, 2) }],
  })
);

server.tool(
  'get_withdrawal_requests',
  'Get all pending withdrawal request IDs for an address.',
  { address: z.string().optional().describe('Ethereum address (defaults to configured wallet)') },
  async ({ address }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getWithdrawalRequests(address), null, 2) }],
  })
);

server.tool(
  'get_withdrawal_status',
  'Check finalization status of withdrawal request IDs.',
  { request_ids: z.array(z.string()).describe('Withdrawal request IDs to check') },
  async ({ request_ids }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getWithdrawalStatus(request_ids), null, 2) }],
  })
);

// ── Wrap / Unwrap ────────────────────────────────────────────────

server.tool(
  'wrap_steth',
  `Wrap stETH into wstETH (non-rebasing, better for DeFi). ${modeNote}`,
  {
    amount_steth: z.string().describe('Amount of stETH to wrap'),
    dry_run: z.boolean().optional().describe('Simulate without broadcasting.'),
  },
  async ({ amount_steth, dry_run }) => ({
    content: [{ type: 'text', text: JSON.stringify(await wrapSteth(amount_steth, dry_run), null, 2) }],
  })
);

server.tool(
  'unwrap_wsteth',
  `Unwrap wstETH back to stETH. ${modeNote}`,
  {
    amount_wsteth: z.string().describe('Amount of wstETH to unwrap'),
    dry_run: z.boolean().optional().describe('Simulate without broadcasting.'),
  },
  async ({ amount_wsteth, dry_run }) => ({
    content: [{ type: 'text', text: JSON.stringify(await unwrapWsteth(amount_wsteth, dry_run), null, 2) }],
  })
);

// ── Governance ───────────────────────────────────────────────────

server.tool(
  'get_proposals',
  'List recent Lido DAO governance proposals from the Aragon Voting contract.',
  { count: z.number().int().min(1).max(20).optional().default(5).describe('Number of recent proposals to fetch') },
  async ({ count }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getProposals(count), null, 2) }],
  })
);

server.tool(
  'get_proposal',
  'Get detailed info on a specific Lido DAO governance proposal.',
  { proposal_id: z.number().int().describe('Proposal/vote ID') },
  async ({ proposal_id }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getProposal(proposal_id), null, 2) }],
  })
);

server.tool(
  'cast_vote',
  `Vote YEA or NAY on a Lido DAO governance proposal. Requires LDO tokens. ${modeNote}`,
  {
    proposal_id: z.number().int().describe('Proposal/vote ID to vote on'),
    support: z.boolean().describe('true = YEA (support), false = NAY (against)'),
    dry_run: z.boolean().optional().describe('Simulate without broadcasting.'),
  },
  async ({ proposal_id, support, dry_run }) => ({
    content: [{ type: 'text', text: JSON.stringify(await castVote(proposal_id, support, dry_run), null, 2) }],
  })
);

// ── L2 Bridging ─────────────────────────────────────────────────

server.tool(
  'get_l2_balance',
  'Get ETH and wstETH balances on Base or Arbitrum. Only works in live (mainnet) mode.',
  {
    source_chain: z.enum(['base', 'arbitrum']).describe('L2 chain to query'),
    address: z.string().optional().describe('Address to check (defaults to configured wallet)'),
  },
  async ({ source_chain, address }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getL2Balance(source_chain, address), null, 2) }],
  })
);

server.tool(
  'get_bridge_quote',
  'Get a quote for bridging ETH or wstETH from an L2 to Ethereum L1 via LI.FI. Mainnet only.',
  {
    source_chain: z.enum(['base', 'arbitrum']).describe('L2 chain to bridge from'),
    token: z.enum(['ETH', 'wstETH']).describe('Token to bridge'),
    amount: z.string().describe('Amount to bridge (e.g. "0.1")'),
    to_token: z.enum(['ETH', 'wstETH']).optional().describe('Token to receive on L1 (default ETH)'),
  },
  async ({ source_chain, token, amount, to_token }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getBridgeQuote(source_chain, token, amount, to_token), null, 2) }],
  })
);

server.tool(
  'bridge_to_ethereum',
  `Bridge ETH or wstETH from Base/Arbitrum to Ethereum L1 via LI.FI. ${modeNote}`,
  {
    source_chain: z.enum(['base', 'arbitrum']).describe('L2 chain to bridge from'),
    token: z.enum(['ETH', 'wstETH']).describe('Token to bridge'),
    amount: z.string().describe('Amount to bridge'),
    to_token: z.enum(['ETH', 'wstETH']).optional().describe('Token to receive on L1'),
    dry_run: z.boolean().optional().describe('Simulate without broadcasting'),
  },
  async ({ source_chain, token, amount, to_token, dry_run }) => ({
    content: [{ type: 'text', text: JSON.stringify(await bridgeToEthereum(source_chain, token, amount, to_token, dry_run), null, 2) }],
  })
);

server.tool(
  'get_bridge_status',
  'Check the status of an in-progress bridge transaction via LI.FI. Mainnet only.',
  {
    tx_hash: z.string().describe('Bridge transaction hash on the L2'),
    source_chain: z.enum(['base', 'arbitrum']).describe('L2 chain the bridge was sent from'),
  },
  async ({ tx_hash, source_chain }) => ({
    content: [{ type: 'text', text: JSON.stringify(await getBridgeStatus(tx_hash, source_chain), null, 2) }],
  })
);

// ── Start ────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Lido MCP server started — ${modeNote}`);
