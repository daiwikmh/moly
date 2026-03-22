import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { type Mode, type Network } from '@/lib/lido-config';
import * as lido from '@/lib/lido';
import * as bridge from '@/lib/bridge';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

const SYSTEM_PROMPT = `You are Moly, an AI assistant for the Lido liquid staking protocol on Ethereum.

FORMATTING RULES (strict):
- NEVER use markdown. No #, ##, ###, *, **, -, bullet lists, or code fences in your replies.
- Write plain sentences and short paragraphs. Use line breaks to separate ideas.
- For lists, write numbered sentences (1. 2. 3.) or just separate lines. No dashes or bullets.
- Format numbers to 4 decimal places for balances.
- Be concise. One or two short sentences per point. No headers, no bold, no italic.

DASHBOARD LIMITATIONS (always enforce):
- This dashboard is simulation-only. It has NO access to any private key.
- All write tools (stake_eth, request_withdrawal, claim_withdrawals, wrap_steth, unwrap_wsteth, cast_vote, bridge_to_ethereum) run as dry-run simulations. They show gas estimates and expected outputs but never broadcast a real transaction.
- When the user asks to execute a write operation, always remind them: "This dashboard can only simulate. To execute real transactions, install the CLI with npx @moly-mcp/lido and run moly setup to configure your wallet. See /docs for the full guide."
- Never pretend a real transaction happened. Always label results as simulated.

KEY FACTS:
- stETH is a rebasing token, balances grow daily as staking rewards accumulate.
- wstETH is a non-rebasing wrapper, better for DeFi integrations.
- The conversion rate between stETH and wstETH changes over time.
- Withdrawals enter a queue and take hours to days to finalize.
- Governance uses LDO tokens via Aragon Voting.
- Testnet uses Hoodi (chain ID 560048), mainnet uses Ethereum (chain ID 1).
- L2 bridging is supported on mainnet only: Base (8453) and Arbitrum (42161) via LI.FI.
- If the user wants to stake ETH from Base or Arbitrum, first check their L2 balance with get_l2_balance, then bridge to Ethereum with bridge_to_ethereum, then after bridging completes use stake_eth.
- Bridge duration is typically 1 to 20 minutes. Tell the user to check back with get_bridge_status.

Always mention which network and chain you are operating on.`;

function withTimeout<T>(fn: () => Promise<T>, ms = 12000): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tool execution timed out')), ms)
    ),
  ]);
}

async function safeTool<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await withTimeout(fn);
  } catch (err: any) {
    return { error: err.message || 'Tool execution failed' };
  }
}

export async function POST(req: Request) {
  const { messages: uiMessages, mode: modeRaw, network: networkRaw, chainId: chainIdRaw } = await req.json();
  const mode: Mode = modeRaw === 'live' ? 'live' : 'simulation';
  const network: Network = networkRaw === 'mainnet' ? 'mainnet' : 'testnet';
  const chainId: string | undefined = chainIdRaw ?? undefined;
  const ctx = { mode, network, chainId };
  const messages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: openrouter.chat('nvidia/nemotron-3-nano-30b-a3b:free'),
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(5),
    tools: {
      get_balance: {
        description: 'Get ETH, stETH, and wstETH balances for an Ethereum address',
        inputSchema: z.object({
          address: z.string().describe('Ethereum address (0x...)'),
        }),
        execute: async ({ address }: { address: string }) => safeTool(() => lido.getBalance(ctx, address)),
      },
      get_rewards: {
        description: 'Get staking reward history for an address over N days',
        inputSchema: z.object({
          address: z.string().describe('Ethereum address'),
          days: z.number().optional().describe('Number of days to look back (default 7)'),
        }),
        execute: async ({ address, days }: { address: string; days?: number }) => safeTool(() => lido.getRewards(ctx, address, days)),
      },
      get_conversion_rate: {
        description: 'Get the current stETH/wstETH conversion rate',
        inputSchema: z.object({}),
        execute: async () => safeTool(() => lido.getConversionRate(ctx)),
      },
      get_withdrawal_requests: {
        description: 'List pending withdrawal request IDs for an address',
        inputSchema: z.object({
          address: z.string().describe('Ethereum address'),
        }),
        execute: async ({ address }: { address: string }) => safeTool(() => lido.getWithdrawalRequests(ctx, address)),
      },
      get_withdrawal_status: {
        description: 'Check finalization status of withdrawal requests',
        inputSchema: z.object({
          request_ids: z.array(z.string()).describe('Array of withdrawal request IDs'),
        }),
        execute: async ({ request_ids }: { request_ids: string[] }) => safeTool(() => lido.getWithdrawalStatus(ctx, request_ids)),
      },
      get_proposals: {
        description: 'List recent Lido DAO governance proposals',
        inputSchema: z.object({
          count: z.number().optional().describe('Number of proposals to fetch (default 5)'),
        }),
        execute: async ({ count }: { count?: number }) => safeTool(() => lido.getProposals(ctx, count)),
      },
      get_proposal: {
        description: 'Get detailed info about a specific governance proposal',
        inputSchema: z.object({
          proposal_id: z.number().describe('Proposal ID'),
        }),
        execute: async ({ proposal_id }: { proposal_id: number }) => safeTool(() => lido.getProposal(ctx, proposal_id)),
      },
      stake_eth: {
        description: 'Simulate staking ETH to receive stETH (dry run only in dashboard)',
        inputSchema: z.object({
          amount_eth: z.string().describe('Amount of ETH to stake'),
        }),
        execute: async ({ amount_eth }: { amount_eth: string }) => safeTool(() => lido.stakeEth(ctx, amount_eth)),
      },
      request_withdrawal: {
        description: 'Simulate requesting a withdrawal of stETH back to ETH (dry run)',
        inputSchema: z.object({
          amount_steth: z.string().describe('Amount of stETH to withdraw'),
        }),
        execute: async ({ amount_steth }: { amount_steth: string }) => safeTool(() => lido.requestWithdrawal(ctx, amount_steth)),
      },
      claim_withdrawals: {
        description: 'Simulate claiming finalized withdrawals (dry run)',
        inputSchema: z.object({
          request_ids: z.array(z.string()).describe('Array of withdrawal request IDs to claim'),
        }),
        execute: async ({ request_ids }: { request_ids: string[] }) => safeTool(() => lido.claimWithdrawals(ctx, request_ids)),
      },
      wrap_steth: {
        description: 'Simulate wrapping stETH to wstETH (dry run)',
        inputSchema: z.object({
          amount_steth: z.string().describe('Amount of stETH to wrap'),
        }),
        execute: async ({ amount_steth }: { amount_steth: string }) => safeTool(() => lido.wrapSteth(ctx, amount_steth)),
      },
      unwrap_wsteth: {
        description: 'Simulate unwrapping wstETH to stETH (dry run)',
        inputSchema: z.object({
          amount_wsteth: z.string().describe('Amount of wstETH to unwrap'),
        }),
        execute: async ({ amount_wsteth }: { amount_wsteth: string }) => safeTool(() => lido.unwrapWsteth(ctx, amount_wsteth)),
      },
      cast_vote: {
        description: 'Simulate casting a vote on a Lido DAO proposal (dry run)',
        inputSchema: z.object({
          proposal_id: z.number().describe('Proposal ID'),
          support: z.boolean().describe('true for YEA, false for NAY'),
        }),
        execute: async ({ proposal_id, support }: { proposal_id: number; support: boolean }) => safeTool(() => lido.castVote(ctx, proposal_id, support)),
      },
      get_l2_balance: {
        description: 'Get ETH and wstETH balances on Base or Arbitrum (mainnet only)',
        inputSchema: z.object({
          source_chain: z.enum(['base', 'arbitrum']).describe('L2 chain to query'),
          address: z.string().describe('Ethereum address (0x...)'),
        }),
        execute: async ({ source_chain, address }: { source_chain: string; address: string }) => safeTool(() => bridge.getL2Balance(ctx, source_chain, address)),
      },
      get_bridge_quote: {
        description: 'Get a quote for bridging ETH or wstETH from L2 to Ethereum L1 (mainnet only)',
        inputSchema: z.object({
          source_chain: z.enum(['base', 'arbitrum']).describe('L2 chain'),
          token: z.enum(['ETH', 'wstETH']).describe('Token to bridge'),
          amount: z.string().describe('Amount to bridge'),
          to_token: z.enum(['ETH', 'wstETH']).optional().describe('Token to receive on L1'),
        }),
        execute: async ({ source_chain, token, amount, to_token }: { source_chain: string; token: string; amount: string; to_token?: string }) => safeTool(() => bridge.getBridgeQuote(ctx, source_chain, token, amount, to_token)),
      },
      bridge_to_ethereum: {
        description: 'Bridge ETH or wstETH from L2 to Ethereum L1 (dry run in dashboard)',
        inputSchema: z.object({
          source_chain: z.enum(['base', 'arbitrum']).describe('L2 chain'),
          token: z.enum(['ETH', 'wstETH']).describe('Token to bridge'),
          amount: z.string().describe('Amount to bridge'),
          to_token: z.enum(['ETH', 'wstETH']).optional().describe('Token to receive on L1'),
        }),
        execute: async ({ source_chain, token, amount, to_token }: { source_chain: string; token: string; amount: string; to_token?: string }) => safeTool(() => bridge.bridgeToEthereum(ctx, source_chain, token, amount, to_token)),
      },
      get_bridge_status: {
        description: 'Check status of a bridge transaction (mainnet only)',
        inputSchema: z.object({
          tx_hash: z.string().describe('Bridge tx hash on the L2'),
          source_chain: z.enum(['base', 'arbitrum']).describe('L2 chain the bridge was sent from'),
        }),
        execute: async ({ tx_hash, source_chain }: { tx_hash: string; source_chain: string }) => safeTool(() => bridge.getBridgeStatus(ctx, tx_hash, source_chain)),
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
