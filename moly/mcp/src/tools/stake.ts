import { parseEther, formatEther } from 'viem';
import { getSDK, publicClient } from '../sdk.js';
import { getWallet, getAddress } from '../wallet.js';
import { config } from '../config.js';

// stETH (Lido) contract addresses
const LIDO_ADDRESSES: Record<number, `0x${string}`> = {
  1: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  17000: '0x3F1c547b21f65e10480dE3ad8E19fAAC46C95034',
};

const SUBMIT_ABI = [
  {
    name: 'submit',
    type: 'function',
    inputs: [{ name: '_referral', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'payable',
  },
] as const;

export async function stakeEth(amountEth: string, dryRun?: boolean) {
  const sdk = getSDK();
  const value = parseEther(amountEth);
  const account = getAddress();
  const lidoAddress = LIDO_ADDRESSES[config.chainId];

  const shouldDryRun = config.isSimulation ? (dryRun !== false) : !!dryRun;

  if (shouldDryRun) {
    const gas = await publicClient.estimateContractGas({
      address: lidoAddress,
      abi: SUBMIT_ABI,
      functionName: 'submit',
      args: [config.referralAddress],
      value,
      account,
    });

    return {
      simulated: true,
      mode: config.mode,
      action: 'stake',
      amountEth,
      estimatedGas: gas.toString(),
      expectedStETH: amountEth,
      note: 'stETH rebases daily — your balance grows automatically after staking.',
    };
  }

  const wallet = getWallet();
  const tx = await sdk.stake.stakeEth({
    value,
    account: { address: account } as any,
    callback: ({ stage, payload }: any) => {},
  });

  return {
    simulated: false,
    mode: config.mode,
    action: 'stake',
    amountEth,
    txHash: (tx as any).hash,
    stethReceived: formatEther((tx as any).result?.stethReceived ?? 0n),
    sharesReceived: formatEther((tx as any).result?.sharesReceived ?? 0n),
  };
}
