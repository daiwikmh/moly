import { parseEther, formatEther } from 'viem';
import { getRuntime } from '../server/runtime.js';

export async function wrapSteth(amountSteth: string, dryRun?: boolean) {
  const rt = getRuntime();
  const amount = parseEther(amountSteth);
  const shouldDryRun = rt.config.mode === 'simulation' ? dryRun !== false : !!dryRun;
  const expectedWstETH = await rt.sdk.wrap.convertStethToWsteth(amount);

  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: 'wrap_steth',
      amountSteth,
      expectedWstETH: formatEther(expectedWstETH),
      note: 'wstETH is non-rebasing — balance stays fixed while value grows. Better for DeFi.',
    };
  }

  const account = rt.getAddress();
  const tx = await rt.sdk.wrap.wrapSteth({
    value: amount,
    account,
    callback: () => {},
  });

  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: 'wrap_steth',
    amountSteth,
    txHash: tx.hash,
    wstethReceived: formatEther(tx.result?.wstethReceived ?? 0n),
  };
}

export async function unwrapWsteth(amountWsteth: string, dryRun?: boolean) {
  const rt = getRuntime();
  const amount = parseEther(amountWsteth);
  const shouldDryRun = rt.config.mode === 'simulation' ? dryRun !== false : !!dryRun;
  const expectedStETH = await rt.sdk.wrap.convertWstethToSteth(amount);

  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: 'unwrap_wsteth',
      amountWsteth,
      expectedStETH: formatEther(expectedStETH),
      note: 'Unwrapping gives rebasing stETH back. Balance updates daily with rewards.',
    };
  }

  const account = rt.getAddress();
  const tx = await rt.sdk.wrap.unwrap({
    value: amount,
    account,
    callback: () => {},
  });

  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: 'unwrap_wsteth',
    amountWsteth,
    txHash: tx.hash,
    stethReceived: formatEther(tx.result?.stethReceived ?? 0n),
  };
}

export async function getConversionRate() {
  const rt = getRuntime();
  const oneEther = parseEther('1');
  const [wstethPerSteth, stethPerWsteth] = await Promise.all([
    rt.sdk.wrap.convertStethToWsteth(oneEther),
    rt.sdk.wrap.convertWstethToSteth(oneEther),
  ]);

  return {
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    '1_stETH_in_wstETH': formatEther(wstethPerSteth),
    '1_wstETH_in_stETH': formatEther(stethPerWsteth),
    note: 'wstETH/stETH ratio increases over time as staking rewards accumulate.',
  };
}
