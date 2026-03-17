import { parseEther, formatEther } from 'viem';
import { getSDK, publicClient } from '../sdk.js';
import { getAddress } from '../wallet.js';
import { config } from '../config.js';

export async function requestWithdrawal(amountSteth: string, dryRun?: boolean) {
  const sdk = getSDK();
  const amount = parseEther(amountSteth);
  const account = getAddress();
  const shouldDryRun = config.isSimulation ? (dryRun !== false) : !!dryRun;

  if (shouldDryRun) {
    return {
      simulated: true,
      mode: config.mode,
      action: 'request_withdrawal',
      amountSteth,
      note: 'Withdrawal requests enter a queue. Finalization can take hours to days depending on validator exits. You will receive an ERC-721 NFT representing your position in the queue.',
      minWithdrawal: '0.1 stETH',
      maxWithdrawal: '1000 stETH per request',
    };
  }

  const tx = await sdk.withdrawals.requestWithdrawals({
    amounts: [amount],
    account: { address: account } as any,
    callback: ({ stage, payload }: any) => {},
  });

  return {
    simulated: false,
    mode: config.mode,
    action: 'request_withdrawal',
    amountSteth,
    txHash: (tx as any).hash,
    requestIds: (tx as any).result?.requestIds?.map((id: bigint) => id.toString()),
    note: 'Check withdrawal status with get_withdrawal_status. Claim when finalized.',
  };
}

export async function claimWithdrawals(requestIds: string[], dryRun?: boolean) {
  const sdk = getSDK();
  const ids = requestIds.map(BigInt);
  const account = getAddress();
  const shouldDryRun = config.isSimulation ? (dryRun !== false) : !!dryRun;

  if (shouldDryRun) {
    return {
      simulated: true,
      mode: config.mode,
      action: 'claim_withdrawals',
      requestIds,
      note: 'Claims can only be made after requests are finalized. Use get_withdrawal_status to check.',
    };
  }

  const tx = await sdk.withdrawals.claimWithdrawals({
    requestsIds: ids,
    account: { address: account } as any,
    callback: ({ stage, payload }: any) => {},
  });

  return {
    simulated: false,
    mode: config.mode,
    action: 'claim_withdrawals',
    requestIds,
    txHash: (tx as any).hash,
  };
}

export async function getWithdrawalRequests(address?: string) {
  const sdk = getSDK();
  const addr = (address ?? getAddress()) as `0x${string}`;

  const requests = await sdk.withdrawals.getWithdrawalRequests({ account: addr });

  return {
    address: addr,
    mode: config.mode,
    requests: requests.map((id: bigint) => id.toString()),
    count: requests.length,
  };
}

export async function getWithdrawalStatus(requestIds: string[]) {
  const sdk = getSDK();
  const ids = requestIds.map(BigInt);

  const statuses = await sdk.withdrawals.getWithdrawalStatus({ requestsIds: ids });

  return {
    mode: config.mode,
    statuses: statuses.map((s: any, i: number) => ({
      requestId: requestIds[i],
      amountOfStETH: formatEther(s.amountOfStETH ?? 0n),
      amountOfShares: formatEther(s.amountOfShares ?? 0n),
      owner: s.owner,
      isFinalized: s.isFinalized,
      isClaimed: s.isClaimed,
    })),
  };
}
