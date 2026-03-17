import { formatEther } from 'viem';
import { getSDK } from '../sdk.js';
import { getAddress } from '../wallet.js';
import { config } from '../config.js';

export async function getBalance(address?: string) {
  const sdk = getSDK();
  const addr = (address ?? getAddress()) as `0x${string}`;

  const [eth, steth, wsteth] = await Promise.all([
    sdk.core.balanceETH(addr),
    sdk.steth.balance(addr),
    sdk.wsteth.balance(addr),
  ]);

  return {
    address: addr,
    mode: config.mode,
    network: config.chain.name,
    balances: {
      eth: formatEther(eth),
      stETH: formatEther(steth),
      wstETH: formatEther(wsteth),
    },
    // APR fetched from protocol stats
  };
}

export async function getRewards(address?: string, days = 7) {
  const sdk = getSDK();
  const addr = (address ?? getAddress()) as `0x${string}`;

  const rewards = await sdk.rewards.getRewardsFromChain({
    address: addr,
    stepBlock: 1000,
    back: { days },
  });

  return {
    address: addr,
    period: `${days} days`,
    totalRewards: formatEther(rewards.totalRewards ?? 0n),
    totalStaked: formatEther(rewards.totalStaked ?? 0n),
    events: rewards.events?.slice(0, 10).map((e: any) => ({
      type: e.type,
      change: formatEther(e.change ?? 0n),
      balance: formatEther(e.balance ?? 0n),
    })),
  };
}
