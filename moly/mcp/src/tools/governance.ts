import { createPublicClient, http, parseAbi, formatEther } from 'viem';
import { getAddress } from '../wallet.js';
import { getWallet } from '../wallet.js';
import { config } from '../config.js';

// Aragon Voting contract addresses
const VOTING_ADDRESSES: Record<number, `0x${string}`> = {
  1: '0x2e59A20f205bB85a89C53f1936454680651E618e',   // mainnet Lido DAO Aragon Voting
  17000: '0xDA7d2573Df555002503F29aA4003e398d28cc00f', // holesky
};

const VOTING_ABI = parseAbi([
  'function vote(uint256 _voteId, bool _supports, bool _executesIfDecided) external',
  'function getVote(uint256 _voteId) external view returns (bool open, bool executed, uint64 startDate, uint64 snapshotBlock, uint64 supportRequired, uint64 minAcceptQuorum, uint256 yea, uint256 nay, uint256 votingPower, bytes script)',
  'function votesLength() external view returns (uint256)',
]);

export async function getProposals(count = 5) {
  const client = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  const votingAddress = VOTING_ADDRESSES[config.chainId];
  if (!votingAddress) throw new Error(`No voting contract for chain ${config.chainId}`);

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
    mode: config.mode,
    network: config.chain.name,
    votingContract: votingAddress,
    totalProposals: latest,
    proposals: votes.reverse(),
  };
}

export async function getProposal(proposalId: number) {
  const client = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  const votingAddress = VOTING_ADDRESSES[config.chainId];
  const v = await client.readContract({
    address: votingAddress,
    abi: VOTING_ABI,
    functionName: 'getVote',
    args: [BigInt(proposalId)],
  });

  return {
    mode: config.mode,
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
  const votingAddress = VOTING_ADDRESSES[config.chainId];
  if (!votingAddress) throw new Error(`No voting contract for chain ${config.chainId}`);
  const shouldDryRun = config.isSimulation ? (dryRun !== false) : !!dryRun;
  const account = getAddress();

  if (shouldDryRun) {
    const proposal = await getProposal(proposalId);
    return {
      simulated: true,
      mode: config.mode,
      action: 'cast_vote',
      proposalId,
      vote: support ? 'YEA' : 'NAY',
      proposal,
      note: 'You need LDO tokens to vote. Voting power is based on LDO balance at snapshot block.',
    };
  }

  const wallet = getWallet();
  const hash = await wallet.writeContract({
    address: votingAddress,
    abi: VOTING_ABI,
    functionName: 'vote',
    args: [BigInt(proposalId), support, false],
    account,
  });

  return {
    simulated: false,
    mode: config.mode,
    action: 'cast_vote',
    proposalId,
    vote: support ? 'YEA' : 'NAY',
    txHash: hash,
  };
}
