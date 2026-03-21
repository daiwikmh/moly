#!/usr/bin/env node
import {
  getRuntime
} from "./chunk-Y3MG4RMT.js";

// src/tools/unstake.ts
import { parseEther, formatEther } from "viem";
async function requestWithdrawal(amountSteth, dryRun) {
  const rt = getRuntime();
  const amount = parseEther(amountSteth);
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: "request_withdrawal",
      amountSteth,
      minWithdrawal: "0.1 stETH",
      maxWithdrawal: "1000 stETH per request",
      note: "Withdrawal requests enter a queue. Finalization can take hours to days depending on validator exits. You will receive an ERC-721 NFT representing your position."
    };
  }
  const account = rt.getAddress();
  const tx = await rt.sdk.withdraw.request.requestWithdrawal({
    amount,
    token: "stETH",
    account,
    callback: () => {
    }
  });
  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: "request_withdrawal",
    amountSteth,
    txHash: tx.hash,
    requestIds: tx.result?.requests?.map((r) => r.requestId.toString()),
    note: "Check status with get_withdrawal_status. Claim when finalized."
  };
}
async function claimWithdrawals(requestIds, dryRun) {
  const rt = getRuntime();
  const ids = requestIds.map(BigInt);
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: "claim_withdrawals",
      requestIds,
      note: "Claims can only be made after requests are finalized. Use get_withdrawal_status first."
    };
  }
  const account = rt.getAddress();
  const tx = await rt.sdk.withdraw.claim.claimRequests({
    requestsIds: ids,
    account,
    callback: () => {
    }
  });
  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: "claim_withdrawals",
    requestIds,
    txHash: tx.hash
  };
}
async function getWithdrawalRequests(address) {
  const rt = getRuntime();
  const addr = address ?? rt.getAddress();
  const requests = await rt.sdk.withdraw.views.getWithdrawalRequestsIds({ account: addr });
  return {
    address: addr,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    requests: requests.map((id) => id.toString()),
    count: requests.length
  };
}
async function getWithdrawalStatus(requestIds) {
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
      isClaimed: s.isClaimed
    }))
  };
}

// src/tools/governance.ts
import { createPublicClient, http, parseAbi, formatEther as formatEther2 } from "viem";
import { mainnet } from "viem/chains";
import { defineChain } from "viem";
var hoodi = defineChain({
  id: 560048,
  name: "Hoodi Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://hoodi.drpc.org"] } }
});
var VOTING_ABI = parseAbi([
  "function vote(uint256 _voteId, bool _supports, bool _executesIfDecided) external",
  "function getVote(uint256 _voteId) external view returns (bool open, bool executed, uint64 startDate, uint64 snapshotBlock, uint64 supportRequired, uint64 minAcceptQuorum, uint256 yea, uint256 nay, uint256 votingPower, bytes script)",
  "function votesLength() external view returns (uint256)"
]);
async function getProposals(count = 5) {
  const rt = getRuntime();
  const votingAddress = rt.chainAddresses.voting;
  const rpcUrl = rt.config.rpc ?? rt.chainAddresses.defaultRpc;
  const viemChain = rt.config.network === "mainnet" ? mainnet : hoodi;
  const client = createPublicClient({ chain: viemChain, transport: http(rpcUrl) });
  const totalVotes = await client.readContract({
    address: votingAddress,
    abi: VOTING_ABI,
    functionName: "votesLength"
  });
  const latest = Number(totalVotes);
  const from = Math.max(0, latest - count);
  const ids = Array.from({ length: latest - from }, (_, i) => from + i);
  const votes = await Promise.all(
    ids.map(async (id) => {
      const v = await client.readContract({
        address: votingAddress,
        abi: VOTING_ABI,
        functionName: "getVote",
        args: [BigInt(id)]
      });
      return {
        id,
        open: v[0],
        executed: v[1],
        startDate: new Date(Number(v[2]) * 1e3).toISOString(),
        yea: formatEther2(v[6]),
        nay: formatEther2(v[7]),
        votingPower: formatEther2(v[8])
      };
    })
  );
  return {
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    votingContract: votingAddress,
    totalProposals: latest,
    proposals: votes.reverse()
  };
}
async function getProposal(proposalId) {
  const rt = getRuntime();
  const votingAddress = rt.chainAddresses.voting;
  const rpcUrl = rt.config.rpc ?? rt.chainAddresses.defaultRpc;
  const viemChain = rt.config.network === "mainnet" ? mainnet : hoodi;
  const client = createPublicClient({ chain: viemChain, transport: http(rpcUrl) });
  const v = await client.readContract({
    address: votingAddress,
    abi: VOTING_ABI,
    functionName: "getVote",
    args: [BigInt(proposalId)]
  });
  return {
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    id: proposalId,
    open: v[0],
    executed: v[1],
    startDate: new Date(Number(v[2]) * 1e3).toISOString(),
    snapshotBlock: v[3].toString(),
    supportRequired: `${(Number(v[4]) / 1e16).toFixed(1)}%`,
    minAcceptQuorum: `${(Number(v[5]) / 1e16).toFixed(1)}%`,
    yea: formatEther2(v[6]),
    nay: formatEther2(v[7]),
    votingPower: formatEther2(v[8])
  };
}
async function castVote(proposalId, support, dryRun) {
  const rt = getRuntime();
  const votingAddress = rt.chainAddresses.voting;
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  if (shouldDryRun) {
    const proposal = await getProposal(proposalId);
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: "cast_vote",
      proposalId,
      vote: support ? "YEA" : "NAY",
      proposal,
      note: "You need LDO tokens to vote. Voting power is based on LDO balance at snapshot block."
    };
  }
  const wallet = rt.getWallet();
  const account = rt.getAddress();
  const viemChain = rt.config.network === "mainnet" ? mainnet : hoodi;
  const hash = await wallet.writeContract({
    chain: viemChain,
    address: votingAddress,
    abi: VOTING_ABI,
    functionName: "vote",
    args: [BigInt(proposalId), support, false],
    account
  });
  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: "cast_vote",
    proposalId,
    vote: support ? "YEA" : "NAY",
    txHash: hash
  };
}

export {
  requestWithdrawal,
  claimWithdrawals,
  getWithdrawalRequests,
  getWithdrawalStatus,
  getProposals,
  getProposal,
  castVote
};
