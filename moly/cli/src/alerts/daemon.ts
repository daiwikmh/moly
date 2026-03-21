import { getRuntime } from '../server/runtime.js';
import { loadAlerts, saveAlerts, loadChannelConfig } from './store.js';
import { dispatch } from './notify.js';
import { getBalance } from '../tools/balance.js';
import { getRewards } from '../tools/balance.js';
import { getConversionRate } from '../tools/wrap.js';
import { getWithdrawalRequests, getWithdrawalStatus } from '../tools/unstake.js';
import { getProposals } from '../tools/governance.js';
import type { Alert } from './types.js';

const COOLDOWN_MS = 5 * 60 * 1000; // 5 min

async function evaluateAlert(alert: Alert, lastProposalCount?: number): Promise<{
  triggered: boolean;
  data: Record<string, unknown>;
  newProposalCount?: number;
} | null> {
  try {
    switch (alert.condition) {
      case 'balance_below':
      case 'balance_above': {
        const res = await getBalance();
        const total = parseFloat(res.balances.eth) + parseFloat(res.balances.stETH) + parseFloat(res.balances.wstETH);
        const hit = alert.condition === 'balance_below'
          ? total < (alert.threshold ?? 0)
          : total > (alert.threshold ?? 0);
        return { triggered: hit, data: { current: total.toFixed(6), balances: res.balances } };
      }

      case 'reward_rate_below':
      case 'reward_rate_above': {
        const res = await getRewards(undefined, 30);
        const rate = parseFloat(res.totalRewards);
        const hit = alert.condition === 'reward_rate_below'
          ? rate < (alert.threshold ?? 0)
          : rate > (alert.threshold ?? 0);
        return { triggered: hit, data: { current: rate.toFixed(6), detail: `${res.totalRewards} ETH over 30d` } };
      }

      case 'conversion_rate_above':
      case 'conversion_rate_below': {
        const res = await getConversionRate();
        const rate = parseFloat(res['1_wstETH_in_stETH']);
        const hit = alert.condition === 'conversion_rate_above'
          ? rate > (alert.threshold ?? 0)
          : rate < (alert.threshold ?? 0);
        return { triggered: hit, data: { current: rate.toFixed(6) } };
      }

      case 'withdrawal_ready': {
        const reqs = await getWithdrawalRequests();
        if (!reqs.requestIds?.length) return { triggered: false, data: { detail: 'no pending withdrawals' } };
        const status = await getWithdrawalStatus(reqs.requestIds);
        const ready = (status.statuses ?? []).filter((s: any) => s.isFinalized);
        return {
          triggered: ready.length > 0,
          data: { current: ready.length, detail: `${ready.length} of ${reqs.requestIds.length} finalized` },
        };
      }

      case 'proposal_new': {
        const res = await getProposals(1);
        const current = res.totalProposals ?? 0;
        if (lastProposalCount === undefined) {
          return { triggered: false, data: { detail: 'tracking started' }, newProposalCount: current };
        }
        return {
          triggered: current > lastProposalCount,
          data: { current, detail: `${current - lastProposalCount} new proposal(s)` },
          newProposalCount: current,
        };
      }

      default:
        return null;
    }
  } catch (err: any) {
    process.stderr.write(`Alert eval error [${alert.condition}]: ${err.message}\n`);
    return null;
  }
}

export async function runDaemon(intervalMs = 30000) {
  getRuntime(); // init early, fail fast if no config
  const channelConfig = loadChannelConfig();

  process.stderr.write(`Alert daemon running, polling every ${intervalMs / 1000}s\n`);

  while (true) {
    const data = loadAlerts();
    const active = data.alerts.filter((a) => a.enabled);

    for (const alert of active) {
      // cooldown check
      if (alert.lastTriggered) {
        const elapsed = Date.now() - new Date(alert.lastTriggered).getTime();
        if (elapsed < COOLDOWN_MS) continue;
      }

      const result = await evaluateAlert(alert, data.lastProposalCount);
      if (!result) continue;

      if (result.newProposalCount !== undefined) {
        data.lastProposalCount = result.newProposalCount;
      }

      if (result.triggered) {
        process.stderr.write(`Alert triggered: ${alert.condition} (${alert.id.slice(0, 8)})\n`);
        await dispatch(channelConfig, alert.channel, alert, result.data);
        alert.lastTriggered = new Date().toISOString();
      }
    }

    saveAlerts(data);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
