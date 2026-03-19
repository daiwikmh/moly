import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { type Mode, type Network } from '@/lib/lido-config';
import * as lido from '@/lib/lido';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

const SYSTEM_PROMPT = `You are Moly, an AI assistant for interacting with the Lido liquid staking protocol on Ethereum.

You have tools to query balances, protocol stats, governance proposals, and simulate staking operations.

Key facts:
- stETH is a rebasing token — balances grow daily as staking rewards accumulate
- wstETH is a non-rebasing wrapper, better for DeFi integrations
- The conversion rate between stETH and wstETH changes over time
- Withdrawals enter a queue and take hours to days to finalize
- Governance uses LDO tokens via Aragon Voting
- Testnet uses Hoodi (chain ID 560048), mainnet uses Ethereum (chain ID 1)
- Mode "simulation" means all write operations are dry-run (no real tx), on any chain
- Mode "live" means the user intends real transactions, but the dashboard still can't broadcast — it shows estimates. Real execution happens via the MCP server with a private key.

When showing results, be concise. Format numbers to 4 decimal places for balances.
Always mention which network and chain you're operating on.`;

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
    },
  });

  return result.toUIMessageStreamResponse();
}
