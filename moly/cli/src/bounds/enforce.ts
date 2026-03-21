import { loadBounds, saveBounds } from './store.js';
import { getBalance } from '../tools/balance.js';

const STAKE_TOOLS = new Set(['stake_eth', 'bridge_to_ethereum']);

export async function checkBounds(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ allowed: boolean; reason?: string }> {
  const bounds = loadBounds();

  // daily reset
  const today = new Date().toISOString().slice(0, 10);
  if (bounds.lastResetDate !== today) {
    bounds.dailyStaked = 0;
    bounds.lastResetDate = today;
    saveBounds(bounds);
  }

  // governance vote check
  if (toolName === 'cast_vote' && !bounds.governanceAutoVote) {
    return { allowed: false, reason: `Governance auto-vote is disabled. Set bounds: governanceAutoVote = true` };
  }

  // stake/bridge amount checks
  if (STAKE_TOOLS.has(toolName)) {
    const amount = parseFloat((args.amount_eth ?? args.amount ?? '0') as string);
    if (isNaN(amount) || amount <= 0) return { allowed: true };

    if (amount > bounds.maxStakePerTx) {
      return { allowed: false, reason: `Amount ${amount} ETH exceeds max per tx (${bounds.maxStakePerTx} ETH)` };
    }

    if (bounds.dailyStaked + amount > bounds.maxDailyStake) {
      return { allowed: false, reason: `Would exceed daily limit: staked today ${bounds.dailyStaked.toFixed(4)} + ${amount} > ${bounds.maxDailyStake} ETH` };
    }

    // min ETH reserve check
    try {
      const bal = await getBalance();
      const ethBal = parseFloat(bal.balances.eth);
      if (ethBal - amount < bounds.minEthReserve) {
        return { allowed: false, reason: `Would leave only ${(ethBal - amount).toFixed(4)} ETH, below reserve of ${bounds.minEthReserve} ETH` };
      }
    } catch {
      // if balance check fails, allow through
    }
  }

  return { allowed: true };
}

export function recordStake(amount: number): void {
  const bounds = loadBounds();
  const today = new Date().toISOString().slice(0, 10);
  if (bounds.lastResetDate !== today) {
    bounds.dailyStaked = 0;
    bounds.lastResetDate = today;
  }
  bounds.dailyStaked += amount;
  saveBounds(bounds);
}
