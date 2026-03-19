import { createPublicClient, http, parseAbi, formatEther } from 'viem';
import { mainnet } from 'viem/chains';
import { defineChain } from 'viem';
import { getRuntime } from '../server/runtime.js';

const hoodi = defineChain({
  id: 560048,
  name: 'Hoodi Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://hoodi.drpc.org'] } },
});

const VOTING_ABI = parseAbi([
  'function vote(uint256 _voteId, bool _supports, bool _executesIfDecided) external',
  'function getVote(uint256 _voteId) external view returns (bool open, bool executed, uint64 startDate, uint64 snapshotBlock, uint64 supportRequired, uint64 minAcceptQuorum, uint256 yea, uint256 nay, uint256 votingPower, bytes script)',
  'function votesLength() external view returns (uint256)',
]);

export async function getProposals(count = 5) {
  const rt = getRuntime();
  const votingAddress = rt.chainAddresses.voting;
  const rpcUrl = rt.config.rpc ?? rt.chainAddresses.defaultRpc;
  const viemChain = rt.config.network === 'mainnet' ? mainnet : hoodi;

  const client = createPublicClient({ chain: viemChain, transport: http(rpcUrl) });

  const totalVotes = await client.readContract({
    address: votingAddress,
    abi: VOTING_ABI,
    functionName: 'votesLength',
  });

  const latest = Number(totalVotes);
  const from = Math.max(0, latest - count);
  const ids = Array.from({ length: latest - from }, (_, i) => from + i);

  const votes = await Promise.all(
    ids.map(async (id) => {
      const v = await client.readContract({
        address: votingAddress,
        abi: VOTING_ABI,
        functionName: 'getVote',
        args: [BigInt(id)],
      });
      return {
        id,
        open: v[0],
        executed: v[1],
        startDate: new Date(Number(v[2]) * 1000).toISOString(),
        yea: formatEther(v[6]),
        nay: formatEther(v[7]),
        votingPower: formatEther(v[8]),
      };
    })
  );

  return {
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    votingContract: votingAddress,
    totalProposals: latest,
    proposals: votes.reverse(),
  };
}

export async function getProposal(proposalId: number) {
  const rt = getRuntime();
  const votingAddress = rt.chainAddresses.voting;
  const rpcUrl = rt.config.rpc ?? rt.chainAddresses.defaultRpc;
  const viemChain = rt.config.network === 'mainnet' ? mainnet : hoodi;

  const client = createPublicClient({ chain: viemChain, transport: http(rpcUrl) });

  const v = await client.readContract({
    address: votingAddress,
    abi: VOTING_ABI,
    functionName: 'getVote',
    args: [BigInt(proposalId)],
  });

  return {
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    id: proposalId,
    open: v[0],
    executed: v[1],
    startDate: new Date(Number(v[2]) * 1000).toISOString(),
    snapshotBlock: v[3].toString(),
    supportRequired: `${(Number(v[4]) / 1e16).toFixed(1)}%`,
    minAcceptQuorum: `${(Number(v[5]) / 1e16).toFixed(1)}%`,
    yea: formatEther(v[6]),
    nay: formatEther(v[7]),
    votingPower: formatEther(v[8]),
  };
}

export async function castVote(proposalId: number, support: boolean, dryRun?: boolean) {
  const rt = getRuntime();
  const votingAddress = rt.chainAddresses.voting;
  const shouldDryRun = rt.config.mode === 'simulation' ? dryRun !== false : !!dryRun;

  if (shouldDryRun) {
    const proposal = await getProposal(proposalId);
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: 'cast_vote',
      proposalId,
      vote: support ? 'YEA' : 'NAY',
      proposal,
      note: 'You need LDO tokens to vote. Voting power is based on LDO balance at snapshot block.',
    };
  }

  const wallet = rt.getWallet();
  const account = rt.getAddress();

  const viemChain = rt.config.network === 'mainnet' ? mainnet : hoodi;
  const hash = await wallet.writeContract({
    chain: viemChain,
    address: votingAddress,
    abi: VOTING_ABI,
    functionName: 'vote',
    args: [BigInt(proposalId), support, false],
    account,
  });

  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: 'cast_vote',
    proposalId,
    vote: support ? 'YEA' : 'NAY',
    txHash: hash,
  };
}
