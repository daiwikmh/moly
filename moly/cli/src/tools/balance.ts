import { formatEther } from 'viem';
import { getRuntime } from '../server/runtime.js';

export async function getBalance(address?: string) {
  const rt = getRuntime();
  const addr = (address ?? rt.getAddress()) as `0x${string}`;

  const [eth, steth, wsteth] = await Promise.all([
    rt.sdk.core.balanceETH(addr),
    rt.sdk.steth.balance(addr),
    rt.sdk.wsteth.balance(addr),
  ]);

  return {
    address: addr,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    balances: {
      eth: formatEther(eth),
      stETH: formatEther(steth),
      wstETH: formatEther(wsteth),
    },
  };
}

export async function getRewards(address?: string, days = 7) {
  const rt = getRuntime();
  const addr = (address ?? rt.getAddress()) as `0x${string}`;

  const rewards = await rt.sdk.rewards.getRewardsFromChain({
    address: addr,
    stepBlock: 1000,
    back: { days: BigInt(days) },
  });

  return {
    address: addr,
    period: `${days} days`,
    totalRewards: formatEther(rewards.totalRewards),
    baseBalance: formatEther(rewards.baseBalance),
    rewards: rewards.rewards.slice(0, 10).map((e) => ({
      type: e.type,
      change: formatEther(e.change),
      balance: formatEther(e.balance),
    })),
  };
}
