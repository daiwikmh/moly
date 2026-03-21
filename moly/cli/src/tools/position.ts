import { getRuntime } from '../server/runtime.js';
import { getBalance } from './balance.js';
import { getL2Balance } from './bridge.js';
import { getConversionRate } from './wrap.js';

export async function getTotalPosition(address?: string) {
  const rt = getRuntime();
  const addr = address ?? rt.getAddress();
  const isMainnet = rt.config.network === 'mainnet';

  const l1 = await getBalance(addr);
  const rate = await getConversionRate();
  const wstethToEth = parseFloat(rate['1_wstETH_in_stETH']);

  const l1Eth = parseFloat(l1.balances.eth);
  const l1Steth = parseFloat(l1.balances.stETH);
  const l1Wsteth = parseFloat(l1.balances.wstETH);
  const l1WstethInEth = l1Wsteth * wstethToEth;

  const positions: Record<string, unknown> = {
    ethereum: {
      eth: l1.balances.eth,
      stETH: l1.balances.stETH,
      wstETH: l1.balances.wstETH,
      ethEquivalent: (l1Eth + l1Steth + l1WstethInEth).toFixed(6),
    },
  };

  let totalEthEquiv = l1Eth + l1Steth + l1WstethInEth;

  if (isMainnet) {
    for (const chain of ['base', 'arbitrum'] as const) {
      try {
        const l2 = await getL2Balance(chain, addr);
        const l2Eth = parseFloat(l2.balances.ETH);
        const l2Wsteth = parseFloat(l2.balances.wstETH);
        const l2WstethInEth = l2Wsteth * wstethToEth;
        positions[chain] = {
          eth: l2.balances.ETH,
          wstETH: l2.balances.wstETH,
          ethEquivalent: (l2Eth + l2WstethInEth).toFixed(6),
        };
        totalEthEquiv += l2Eth + l2WstethInEth;
      } catch {
        positions[chain] = { error: 'failed to fetch' };
      }
    }
  }

  return {
    address: addr,
    network: rt.chainAddresses.name,
    conversionRate: rate['1_wstETH_in_stETH'],
    positions,
    totalEthEquivalent: totalEthEquiv.toFixed(6),
    note: isMainnet ? 'Includes Ethereum + Base + Arbitrum' : 'Testnet: Ethereum only',
  };
}
