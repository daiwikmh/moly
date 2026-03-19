import { parseEther, formatEther } from 'viem';
import { getRuntime } from '../server/runtime.js';

export async function requestWithdrawal(amountSteth: string, dryRun?: boolean) {
  const rt = getRuntime();
  const amount = parseEther(amountSteth);
  const shouldDryRun = rt.config.mode === 'simulation' ? dryRun !== false : !!dryRun;

  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: 'request_withdrawal',
      amountSteth,
      minWithdrawal: '0.1 stETH',
      maxWithdrawal: '1000 stETH per request',
      note: 'Withdrawal requests enter a queue. Finalization can take hours to days depending on validator exits. You will receive an ERC-721 NFT representing your position.',
    };
  }

  const account = rt.getAddress();
  const tx = await rt.sdk.withdraw.request.requestWithdrawal({
    amount,
    token: 'stETH',
    account,
    callback: () => {},
  });

  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: 'request_withdrawal',
    amountSteth,
    txHash: tx.hash,
    requestIds: tx.result?.requests?.map((r) => r.requestId.toString()),
    note: 'Check status with get_withdrawal_status. Claim when finalized.',
  };
}

export async function claimWithdrawals(requestIds: string[], dryRun?: boolean) {
  const rt = getRuntime();
  const ids = requestIds.map(BigInt);
  const shouldDryRun = rt.config.mode === 'simulation' ? dryRun !== false : !!dryRun;

  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: 'claim_withdrawals',
      requestIds,
      note: 'Claims can only be made after requests are finalized. Use get_withdrawal_status first.',
    };
  }

  const account = rt.getAddress();
  const tx = await rt.sdk.withdraw.claim.claimRequests({
    requestsIds: ids,
    account,
    callback: () => {},
  });

  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: 'claim_withdrawals',
    requestIds,
    txHash: tx.hash,
  };
}

export async function getWithdrawalRequests(address?: string) {
  const rt = getRuntime();
  const addr = (address ?? rt.getAddress()) as `0x${string}`;
  const requests = await rt.sdk.withdraw.views.getWithdrawalRequestsIds({ account: addr });

  return {
    address: addr,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    requests: requests.map((id) => id.toString()),
    count: requests.length,
  };
}

export async function getWithdrawalStatus(requestIds: string[]) {
  const rt = getRuntime();
  const ids = requestIds.map(BigInt);
  const statuses = await rt.sdk.withdraw.views.getWithdrawalStatus({ requestsIds: ids });

  return {
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    statuses: statuses.map((s, i) => ({
      requestId: requestIds[i],
      amountOfStETH: formatEther(s.amountOfStETH),
      amountOfShares: formatEther(s.amountOfShares),
      owner: s.owner,
      isFinalized: s.isFinalized,
      isClaimed: s.isClaimed,
    })),
  };
}
