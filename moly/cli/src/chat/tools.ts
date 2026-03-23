import { getBalance, getRewards } from '../tools/balance.js';
import { stakeEth } from '../tools/stake.js';
import { requestWithdrawal, claimWithdrawals, getWithdrawalRequests, getWithdrawalStatus } from '../tools/unstake.js';
import { wrapSteth, unwrapWsteth, getConversionRate } from '../tools/wrap.js';
import { getProposals, getProposal, castVote } from '../tools/governance.js';
import { getSettings, updateSettings } from '../tools/settings.js';
import { getL2Balance, getBridgeQuote, bridgeToEthereum, getBridgeStatus } from '../tools/bridge.js';
import { setAlert, listAlerts, removeAlertById, configureAlertChannels } from '../tools/alerts.js';
import { getTotalPosition } from '../tools/position.js';
import { loadBounds, saveBounds } from '../bounds/store.js';
import { queryLedger, ledgerStats } from '../ledger/store.js';
import type { Bounds } from '../bounds/types.js';

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
    name: 'get_wallet',
    description: 'Get the configured wallet public address.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_settings',
    description: 'Get current Moly configuration.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'update_settings',
    description: 'Change mode, network, RPC, or chain scope.',
    parameters: {
      type: 'object',
      properties: {
        network: { type: 'string', enum: ['hoodi', 'mainnet'] },
        mode: { type: 'string', enum: ['simulation', 'live'] },
        rpc: { type: 'string', nullable: true },
        model: { type: 'string' },
        chain_scope: { type: 'string', enum: ['ethereum', 'all'], description: 'ethereum = L1 only, all = L1 + Base/Arbitrum bridging' },
      },
    },
  },
  {
    name: 'get_l2_balance',
    description: 'Get ETH and wstETH balances on Base or Arbitrum L2. Mainnet only.',
    parameters: {
      type: 'object',
      required: ['source_chain'],
      properties: {
        source_chain: { type: 'string', enum: ['base', 'arbitrum'], description: 'L2 chain to query' },
        address: { type: 'string', description: 'Address to check (optional, defaults to wallet)' },
      },
    },
  },
  {
    name: 'get_bridge_quote',
    description: 'Get a quote for bridging ETH or wstETH from an L2 to Ethereum L1 via LI.FI. Mainnet only.',
    parameters: {
      type: 'object',
      required: ['source_chain', 'token', 'amount'],
      properties: {
        source_chain: { type: 'string', enum: ['base', 'arbitrum'] },
        token: { type: 'string', enum: ['ETH', 'wstETH'], description: 'Token to bridge' },
        amount: { type: 'string', description: 'Amount to bridge (e.g. "0.1")' },
        to_token: { type: 'string', enum: ['ETH', 'wstETH'], description: 'Token to receive on L1 (default ETH)' },
      },
    },
  },
  {
    name: 'bridge_to_ethereum',
    description: 'Bridge ETH or wstETH from Base/Arbitrum to Ethereum L1 via LI.FI. Mainnet only.',
    parameters: {
      type: 'object',
      required: ['source_chain', 'token', 'amount'],
      properties: {
        source_chain: { type: 'string', enum: ['base', 'arbitrum'] },
        token: { type: 'string', enum: ['ETH', 'wstETH'] },
        amount: { type: 'string', description: 'Amount to bridge' },
        to_token: { type: 'string', enum: ['ETH', 'wstETH'] },
        dry_run: { type: 'boolean', description: 'Simulate without broadcasting' },
      },
    },
  },
  {
    name: 'get_bridge_status',
    description: 'Check the status of an in-progress bridge transaction. Mainnet only.',
    parameters: {
      type: 'object',
      required: ['tx_hash', 'source_chain'],
      properties: {
        tx_hash: { type: 'string', description: 'Bridge transaction hash on the L2' },
        source_chain: { type: 'string', enum: ['base', 'arbitrum'] },
      },
    },
  },
  {
    name: 'set_alert',
    description: 'Create a new alert. Conditions: balance_below, balance_above, reward_rate_below, reward_rate_above, withdrawal_ready, proposal_new, conversion_rate_above, conversion_rate_below.',
    parameters: {
      type: 'object',
      required: ['condition'],
      properties: {
        condition: { type: 'string', description: 'Alert condition type' },
        threshold: { type: 'number', description: 'Numeric threshold (required for _above/_below conditions)' },
        channel: { type: 'string', enum: ['telegram', 'webhook'], description: 'Notification channel (default: telegram)' },
      },
    },
  },
  {
    name: 'list_alerts',
    description: 'List all configured alerts.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'remove_alert',
    description: 'Remove an alert by ID.',
    parameters: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: 'Alert ID to remove' } },
    },
  },
  {
    name: 'configure_alert_channels',
    description: 'Configure Telegram and/or webhook notification channels for alerts.',
    parameters: {
      type: 'object',
      properties: {
        telegram_token: { type: 'string', description: 'Telegram bot token' },
        telegram_chat_id: { type: 'string', description: 'Telegram chat ID' },
        webhook_url: { type: 'string', description: 'Webhook URL for HTTP POST notifications' },
      },
    },
  },
  {
    name: 'get_total_position',
    description: 'Aggregated cross-chain position: ETH, stETH, wstETH across Ethereum + Base + Arbitrum, all converted to ETH equivalent.',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum address (optional)' },
      },
    },
  },
  {
    name: 'get_bounds',
    description: 'Get current policy bounds (max stake per tx, daily limit, min ETH reserve, governance auto-vote).',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'set_bounds',
    description: 'Update policy bounds that gate write operations.',
    parameters: {
      type: 'object',
      properties: {
        maxStakePerTx: { type: 'number', description: 'Max ETH per single stake' },
        maxDailyStake: { type: 'number', description: 'Max ETH staked per day' },
        minEthReserve: { type: 'number', description: 'Min ETH to keep unstaked for gas' },
        autoRestakeThreshold: { type: 'number', description: 'Auto-restake rewards threshold in ETH' },
        governanceAutoVote: { type: 'boolean', description: 'Allow agent to auto-vote on proposals' },
      },
    },
  },
  {
    name: 'get_trade_history',
    description: 'Query the activity ledger with filters.',
    parameters: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Filter by tool name (e.g. stake_eth)' },
        since: { type: 'string', description: 'ISO date to filter from (e.g. 2026-01-01)' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
  },
  {
    name: 'get_staking_summary',
    description: 'Aggregate stats from the activity ledger: total operations, staked ETH, errors.',
    parameters: {
      type: 'object',
      properties: {
        since: { type: 'string', description: 'ISO date to filter from (optional)' },
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
      case 'get_wallet': {
        const { getRuntime } = await import('../server/runtime.js');
        const addr = getRuntime().getAddress();
        result = { address: addr };
        break;
      }
      case 'get_settings':        result = getSettings(); break;
      case 'update_settings':     result = updateSettings(args as any); break;
      case 'get_l2_balance':      result = await getL2Balance(args.source_chain as any, args.address as string | undefined); break;
      case 'get_bridge_quote':    result = await getBridgeQuote(args.source_chain as any, args.token as any, args.amount as string, args.to_token as string | undefined); break;
      case 'bridge_to_ethereum':  result = await bridgeToEthereum(args.source_chain as any, args.token as any, args.amount as string, args.to_token as string | undefined, args.dry_run as boolean | undefined); break;
      case 'get_bridge_status':   result = await getBridgeStatus(args.tx_hash as string, args.source_chain as any); break;
      case 'set_alert':           result = setAlert(args as any); break;
      case 'list_alerts':         result = listAlerts(); break;
      case 'remove_alert':        result = removeAlertById(args.id as string); break;
      case 'configure_alert_channels': result = configureAlertChannels(args as any); break;
      case 'get_total_position':  result = await getTotalPosition(args.address as string | undefined); break;
      case 'get_bounds':          result = loadBounds(); break;
      case 'set_bounds': {
        const current = loadBounds();
        const patch = args as Partial<Bounds>;
        if (patch.maxStakePerTx !== undefined) current.maxStakePerTx = patch.maxStakePerTx;
        if (patch.maxDailyStake !== undefined) current.maxDailyStake = patch.maxDailyStake;
        if (patch.minEthReserve !== undefined) current.minEthReserve = patch.minEthReserve;
        if (patch.autoRestakeThreshold !== undefined) current.autoRestakeThreshold = patch.autoRestakeThreshold;
        if (patch.governanceAutoVote !== undefined) current.governanceAutoVote = patch.governanceAutoVote;
        saveBounds(current);
        result = current;
        break;
      }
      case 'get_trade_history':   result = queryLedger({ tool: args.tool as string, since: args.since as string, limit: args.limit as number }); break;
      case 'get_staking_summary': result = ledgerStats(args.since as string | undefined); break;
      default: return `Unknown tool: ${name}`;
    }
    return JSON.stringify(result, null, 2);
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}
