#!/usr/bin/env node
import {
  getRuntime
} from "./chunk-2MF5MDUT.js";

// src/tools/balance.ts
import { formatEther } from "viem";
async function getBalance(address) {
  const rt = getRuntime();
  const addr = address ?? rt.getAddress();
  const [eth, steth, wsteth] = await Promise.all([
    rt.sdk.core.balanceETH(addr),
    rt.sdk.steth.balance(addr),
    rt.sdk.wsteth.balance(addr)
  ]);
  return {
    address: addr,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    balances: {
      eth: formatEther(eth),
      stETH: formatEther(steth),
      wstETH: formatEther(wsteth)
    }
  };
}
async function getRewards(address, days = 7) {
  const rt = getRuntime();
  const addr = address ?? rt.getAddress();
  const rewards = await rt.sdk.rewards.getRewardsFromChain({
    address: addr,
    stepBlock: 1e3,
    back: { days: BigInt(days) }
  });
  return {
    address: addr,
    period: `${days} days`,
    totalRewards: formatEther(rewards.totalRewards),
    baseBalance: formatEther(rewards.baseBalance),
    rewards: rewards.rewards.slice(0, 10).map((e) => ({
      type: e.type,
      change: formatEther(e.change),
      balance: formatEther(e.balance)
    }))
  };
}

export {
  getBalance,
  getRewards
};
