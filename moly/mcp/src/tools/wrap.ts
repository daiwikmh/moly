import { parseEther, formatEther } from 'viem';
import { getSDK } from '../sdk.js';
import { getAddress } from '../wallet.js';
import { config } from '../config.js';

export async function wrapSteth(amountSteth: string, dryRun?: boolean) {
  const sdk = getSDK();
  const amount = parseEther(amountSteth);
  const account = getAddress();
  const shouldDryRun = config.isSimulation ? (dryRun !== false) : !!dryRun;

  // Get current wstETH conversion rate
  const wstethPerSteth = await sdk.core.convertStethToWsteth(amount);

  if (shouldDryRun) {
    return {
      simulated: true,
      mode: config.mode,
      action: 'wrap_steth',
      amountSteth,
      expectedWstETH: formatEther(wstethPerSteth),
      note: 'wstETH is a non-rebasing wrapper. Its balance stays fixed while its value grows. Better for DeFi integrations.',
    };
  }

  const tx = await sdk.wrap.wrapSteth({
    value: amount,
    account: { address: account } as any,
    callback: ({ stage, payload }: any) => {},
  });

  return {
    simulated: false,
    mode: config.mode,
    action: 'wrap_steth',
    amountSteth,
    txHash: (tx as any).hash,
    wstethReceived: formatEther((tx as any).result?.wstethReceived ?? 0n),
  };
}

export async function unwrapWsteth(amountWsteth: string, dryRun?: boolean) {
  const sdk = getSDK();
  const amount = parseEther(amountWsteth);
  const account = getAddress();
  const shouldDryRun = config.isSimulation ? (dryRun !== false) : !!dryRun;

  const stethAmount = await sdk.core.convertWstethToSteth(amount);

  if (shouldDryRun) {
    return {
      simulated: true,
      mode: config.mode,
      action: 'unwrap_wsteth',
      amountWsteth,
      expectedStETH: formatEther(stethAmount),
      note: 'Unwrapping gives you rebasing stETH back. Your balance will update daily with rewards.',
    };
  }

  const tx = await sdk.wrap.unwrapWsteth({
    value: amount,
    account: { address: account } as any,
    callback: ({ stage, payload }: any) => {},
  });

  return {
    simulated: false,
    mode: config.mode,
    action: 'unwrap_wsteth',
    amountWsteth,
    txHash: (tx as any).hash,
    stethReceived: formatEther((tx as any).result?.stethReceived ?? 0n),
  };
}

export async function getConversionRate() {
  const sdk = getSDK();
  const oneEther = parseEther('1');
  const [wstethPerSteth, stethPerWsteth] = await Promise.all([
    sdk.core.convertStethToWsteth(oneEther),
    sdk.core.convertWstethToSteth(oneEther),
  ]);

  return {
    mode: config.mode,
    '1_stETH_in_wstETH': formatEther(wstethPerSteth),
    '1_wstETH_in_stETH': formatEther(stethPerWsteth),
    note: 'wstETH/stETH ratio increases over time as staking rewards accumulate.',
  };
}
