import { parseEther, formatEther } from 'viem';
import { getRuntime } from '../server/runtime.js';

const SUBMIT_ABI = [
  {
    name: 'submit',
    type: 'function',
    inputs: [{ name: '_referral', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'payable',
  },
] as const;

const REFERRAL = '0x0000000000000000000000000000000000000000' as `0x${string}`;

export async function stakeEth(amountEth: string, dryRun?: boolean) {
  const rt = getRuntime();
  const value = parseEther(amountEth);
  const lidoAddress = rt.chainAddresses.stETH;
  const shouldDryRun = rt.config.mode === 'simulation' ? dryRun !== false : !!dryRun;

  if (shouldDryRun) {
    let estimatedGas = 'unavailable';
    try {
      const gas = await rt.publicClient.estimateContractGas({
        address: lidoAddress,
        abi: SUBMIT_ABI,
        functionName: 'submit',
        args: [REFERRAL],
        value,
        account: '0x0000000000000000000000000000000000000001',
      });
      estimatedGas = gas.toString();
    } catch { /* gas estimation may fail on testnet */ }

    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: 'stake',
      amountEth,
      estimatedGas,
      expectedStETH: amountEth,
      note: 'stETH rebases daily — your balance grows automatically after staking.',
    };
  }

  const account = rt.getAddress();
  const tx = await rt.sdk.stake.stakeEth({
    value,
    account: { address: account } as any,
    callback: () => {},
  });

  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: 'stake',
    amountEth,
    txHash: (tx as any).hash,
    stethReceived: formatEther((tx as any).result?.stethReceived ?? 0n),
    sharesReceived: formatEther((tx as any).result?.sharesReceived ?? 0n),
  };
}
