import { getBalance, getRewards } from '../tools/balance.js';
import { stakeEth } from '../tools/stake.js';
import { requestWithdrawal, claimWithdrawals, getWithdrawalRequests, getWithdrawalStatus } from '../tools/unstake.js';
import { wrapSteth, unwrapWsteth, getConversionRate } from '../tools/wrap.js';
import { getProposals, getProposal, castVote } from '../tools/governance.js';
import { getSettings, updateSettings } from '../tools/settings.js';

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'get_balance',
    description: 'Get ETH, stETH, and wstETH balances for an address.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum address (optional, defaults to configured wallet)' },
      },
    },
  },
  {
    name: 'get_rewards',
    description: 'Get staking reward history for an address over N days.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum address (optional)' },
        days: { type: 'number', description: 'Days to look back (1-365), default 7' },
      },
    },
  },
  {
    name: 'get_conversion_rate',
    description: 'Get current stETH ↔ wstETH conversion rates.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'stake_eth',
    description: 'Stake ETH to receive stETH (liquid staking).',
    parameters: {
      type: 'object',
      required: ['amount_eth'],
      properties: {
        amount_eth: { type: 'string', description: 'Amount of ETH to stake (e.g. "0.1")' },
        dry_run: { type: 'boolean', description: 'Simulate without broadcasting' },
      },
    },
  },
  {
    name: 'request_withdrawal',
    description: 'Request withdrawal of stETH back to ETH. Min 0.1, max 1000 stETH.',
    parameters: {
      type: 'object',
      required: ['amount_steth'],
      properties: {
        amount_steth: { type: 'string', description: 'Amount of stETH to withdraw' },
        dry_run: { type: 'boolean' },
      },
    },
  },
  {
    name: 'claim_withdrawals',
    description: 'Claim finalized withdrawal requests and receive ETH.',
    parameters: {
      type: 'object',
      required: ['request_ids'],
      properties: {
        request_ids: { type: 'array', items: { type: 'string' }, description: 'Withdrawal request NFT IDs' },
        dry_run: { type: 'boolean' },
      },
    },
  },
  {
    name: 'get_withdrawal_requests',
    description: 'Get all pending withdrawal request IDs for an address.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum address (optional)' },
      },
    },
  },
  {
    name: 'get_withdrawal_status',
    description: 'Check finalization status of withdrawal request IDs.',
    parameters: {
      type: 'object',
      required: ['request_ids'],
      properties: {
        request_ids: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'wrap_steth',
    description: 'Wrap stETH into wstETH.',
    parameters: {
      type: 'object',
      required: ['amount_steth'],
      properties: {
        amount_steth: { type: 'string' },
        dry_run: { type: 'boolean' },
      },
    },
  },
  {
    name: 'unwrap_wsteth',
    description: 'Unwrap wstETH back to stETH.',
    parameters: {
      type: 'object',
      required: ['amount_wsteth'],
      properties: {
        amount_wsteth: { type: 'string' },
        dry_run: { type: 'boolean' },
      },
    },
  },
  {
    name: 'get_proposals',
    description: 'List recent Lido DAO governance proposals.',
    parameters: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of proposals (1-20, default 5)' },
      },
    },
  },
  {
    name: 'get_proposal',
    description: 'Get detailed info on a specific Lido DAO governance proposal.',
    parameters: {
      type: 'object',
      required: ['proposal_id'],
      properties: {
        proposal_id: { type: 'number' },
      },
    },
  },
  {
    name: 'cast_vote',
    description: 'Vote YEA or NAY on a Lido DAO governance proposal.',
    parameters: {
      type: 'object',
      required: ['proposal_id', 'support'],
      properties: {
        proposal_id: { type: 'number' },
        support: { type: 'boolean', description: 'true = YEA, false = NAY' },
        dry_run: { type: 'boolean' },
      },
    },
  },
  {
    name: 'get_settings',
    description: 'Get current Moly configuration.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'update_settings',
    description: 'Change mode, network, or RPC.',
    parameters: {
      type: 'object',
      properties: {
        network: { type: 'string', enum: ['hoodi', 'mainnet'] },
        mode: { type: 'string', enum: ['simulation', 'live'] },
        rpc: { type: 'string', nullable: true },
        model: { type: 'string' },
      },
    },
  },
];

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    let result: unknown;
    switch (name) {
      case 'get_balance':         result = await getBalance(args.address as string | undefined); break;
      case 'get_rewards':         result = await getRewards(args.address as string | undefined, args.days as number | undefined); break;
      case 'get_conversion_rate': result = await getConversionRate(); break;
      case 'stake_eth':           result = await stakeEth(args.amount_eth as string, args.dry_run as boolean | undefined); break;
      case 'request_withdrawal':  result = await requestWithdrawal(args.amount_steth as string, args.dry_run as boolean | undefined); break;
      case 'claim_withdrawals':   result = await claimWithdrawals(args.request_ids as string[], args.dry_run as boolean | undefined); break;
      case 'get_withdrawal_requests': result = await getWithdrawalRequests(args.address as string | undefined); break;
      case 'get_withdrawal_status':   result = await getWithdrawalStatus(args.request_ids as string[]); break;
      case 'wrap_steth':          result = await wrapSteth(args.amount_steth as string, args.dry_run as boolean | undefined); break;
      case 'unwrap_wsteth':       result = await unwrapWsteth(args.amount_wsteth as string, args.dry_run as boolean | undefined); break;
      case 'get_proposals':       result = await getProposals(args.count as number | undefined); break;
      case 'get_proposal':        result = await getProposal(args.proposal_id as number); break;
      case 'cast_vote':           result = await castVote(args.proposal_id as number, args.support as boolean, args.dry_run as boolean | undefined); break;
      case 'get_settings':        result = getSettings(); break;
      case 'update_settings':     result = updateSettings(args as any); break;
      default: return `Unknown tool: ${name}`;
    }
    return JSON.stringify(result, null, 2);
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}
