import { formatEther, parseEther, parseAbi } from 'viem';
import { type Mode, type Network, getChain, getClient } from './lido-config';

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
]);

const WSTETH_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function stEthPerToken() view returns (uint256)',
  'function tokensPerStEth() view returns (uint256)',
]);

const VOTING_ABI = parseAbi([
  'function getVote(uint256) view returns (bool open, bool executed, uint64 startDate, uint64 snapshotBlock, uint64 supportRequired, uint64 minAcceptQuorum, uint256 yea, uint256 nay, uint256 votingPower, bytes script)',
  'function votesLength() view returns (uint256)',
]);

const SUBMIT_ABI = parseAbi([
  'function submit(address _referral) payable returns (uint256)',
]);

interface Ctx {
  mode: Mode;
  network: Network;
  chainId?: string;
}

// ─── Read Tools ──────────────────────────────────────────────

export async function getBalance(ctx: Ctx, address: string) {
  const client = getClient(ctx.network, ctx.chainId);
  const c = getChain(ctx.network, ctx.chainId);
  const addr = address as `0x${string}`;

  const [eth, steth, wsteth] = await Promise.all([
    client.getBalance({ address: addr }),
    client.readContract({ address: c.addrs.steth, abi: ERC20_ABI, functionName: 'balanceOf', args: [addr] }),
    client.readContract({ address: c.addrs.wsteth, abi: ERC20_ABI, functionName: 'balanceOf', args: [addr] }),
  ]);

  return {
    address: addr,
    network: c.name,
    chain: c.id,
    balances: { eth: formatEther(eth), stETH: formatEther(steth), wstETH: formatEther(wsteth) },
  };
}

export async function getRewards(ctx: Ctx, address: string, days = 7) {
  const c = getChain(ctx.network, ctx.chainId);
  return {
    address,
    network: c.name,
    period: `${days} days`,
    note: 'Reward history requires Lido SDK. Use the MCP server for detailed reward data.',
  };
}

export async function getConversionRate(ctx: Ctx) {
  const client = getClient(ctx.network, ctx.chainId);
  const c = getChain(ctx.network, ctx.chainId);

  const [stethPerWsteth, tokensPerSteth] = await Promise.all([
    client.readContract({ address: c.addrs.wsteth, abi: WSTETH_ABI, functionName: 'stEthPerToken' }),
    client.readContract({ address: c.addrs.wsteth, abi: WSTETH_ABI, functionName: 'tokensPerStEth' }),
  ]);

  return {
    network: c.name,
    '1_stETH_in_wstETH': formatEther(tokensPerSteth),
    '1_wstETH_in_stETH': formatEther(stethPerWsteth),
    note: 'wstETH/stETH ratio increases over time as staking rewards accumulate.',
  };
}

export async function getWithdrawalRequests(ctx: Ctx, address: string) {
  const c = getChain(ctx.network, ctx.chainId);
  return {
    address,
    network: c.name,
    note: 'Withdrawal request listing requires Lido SDK. Use the MCP server for this.',
    requests: [],
    count: 0,
  };
}

export async function getWithdrawalStatus(ctx: Ctx, requestIds: string[]) {
  const c = getChain(ctx.network, ctx.chainId);
  return {
    network: c.name,
    requestIds,
    note: 'Withdrawal status requires Lido SDK. Use the MCP server for this.',
    statuses: [],
  };
}

export async function getProposals(ctx: Ctx, count = 5) {
  const client = getClient(ctx.network, ctx.chainId);
  const c = getChain(ctx.network, ctx.chainId);

  try {
    const totalVotes = await client.readContract({
      address: c.addrs.voting,
      abi: VOTING_ABI,
      functionName: 'votesLength',
    });

    const latest = Number(totalVotes);
    if (latest === 0) return { network: c.name, total: 0, proposals: [] };

    const from = Math.max(0, latest - count);
    const ids = Array.from({ length: latest - from }, (_, i) => from + i);

    const votes = await Promise.all(
      ids.map(async (id) => {
        try {
          const v = await client.readContract({
            address: c.addrs.voting,
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
        } catch {
          return { id, open: false, executed: false, startDate: '', yea: '0', nay: '0', votingPower: '0', error: true };
        }
      })
    );

    return { network: c.name, total: latest, proposals: votes.reverse() };
  } catch (err: any) {
    return { network: c.name, total: 0, proposals: [], error: err.message };
  }
}

export async function getProposal(ctx: Ctx, proposalId: number) {
  const client = getClient(ctx.network, ctx.chainId);
  const c = getChain(ctx.network, ctx.chainId);

  const v = await client.readContract({
    address: c.addrs.voting,
    abi: VOTING_ABI,
    functionName: 'getVote',
    args: [BigInt(proposalId)],
  });

  return {
    network: c.name,
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

// ─── Write Tools (always dry_run in dashboard) ───────────────

export async function stakeEth(ctx: Ctx, amountEth: string) {
  const client = getClient(ctx.network, ctx.chainId);
  const c = getChain(ctx.network, ctx.chainId);
  const value = parseEther(amountEth);

  try {
    const gas = await client.estimateContractGas({
      address: c.addrs.steth,
      abi: SUBMIT_ABI,
      functionName: 'submit',
      args: ['0x0000000000000000000000000000000000000000'],
      value,
      account: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    });

    return {
      simulated: true,
      network: c.name,
      action: 'stake',
      amountEth,
      estimatedGas: gas.toString(),
      expectedStETH: amountEth,
      mode: ctx.mode,
      note: ctx.mode === 'simulation'
        ? 'Dry run (simulation mode) — no transaction sent. Switch to Live mode or use MCP server for real transactions.'
        : 'Dry run estimate on live mode. Dashboard cannot broadcast — use MCP server with private key.',
    };
  } catch (err: any) {
    return {
      simulated: true,
      network: c.name,
      action: 'stake',
      amountEth,
      estimatedGas: 'estimation failed',
      expectedStETH: amountEth,
      error: err.message,
      note: 'Gas estimation failed. The stake would produce ~equal stETH.',
    };
  }
}

export async function requestWithdrawal(ctx: Ctx, amountSteth: string) {
  const c = getChain(ctx.network, ctx.chainId);
  return {
    simulated: true,
    network: c.name,
    action: 'request_withdrawal',
    amountSteth,
    note: 'Dry run — withdrawal requests enter a queue. Use the MCP server to execute.',
    minWithdrawal: '0.1 stETH',
    maxWithdrawal: '1000 stETH per request',
  };
}

export async function claimWithdrawals(ctx: Ctx, requestIds: string[]) {
  const c = getChain(ctx.network, ctx.chainId);
  return {
    simulated: true,
    network: c.name,
    action: 'claim_withdrawals',
    requestIds,
    note: 'Dry run — claims can only be made after requests are finalized. Use the MCP server to execute.',
  };
}

export async function wrapSteth(ctx: Ctx, amountSteth: string) {
  const client = getClient(ctx.network, ctx.chainId);
  const c = getChain(ctx.network, ctx.chainId);

  try {
    const tokensPerSteth = await client.readContract({
      address: c.addrs.wsteth,
      abi: WSTETH_ABI,
      functionName: 'tokensPerStEth',
    });
    const expectedWsteth = (parseEther(amountSteth) * tokensPerSteth) / parseEther('1');

    return {
      simulated: true,
      network: c.name,
      action: 'wrap_steth',
      amountSteth,
      expectedWstETH: formatEther(expectedWsteth),
      note: 'Dry run — wrapping gives you non-rebasing wstETH. Use the MCP server to execute.',
    };
  } catch {
    return {
      simulated: true,
      network: c.name,
      action: 'wrap_steth',
      amountSteth,
      note: 'Dry run — could not estimate conversion. Use the MCP server to execute.',
    };
  }
}

export async function unwrapWsteth(ctx: Ctx, amountWsteth: string) {
  const client = getClient(ctx.network, ctx.chainId);
  const c = getChain(ctx.network, ctx.chainId);

  try {
    const stethPerWsteth = await client.readContract({
      address: c.addrs.wsteth,
      abi: WSTETH_ABI,
      functionName: 'stEthPerToken',
    });
    const expectedSteth = (parseEther(amountWsteth) * stethPerWsteth) / parseEther('1');

    return {
      simulated: true,
      network: c.name,
      action: 'unwrap_wsteth',
      amountWsteth,
      expectedStETH: formatEther(expectedSteth),
      note: 'Dry run — unwrapping gives rebasing stETH back. Use the MCP server to execute.',
    };
  } catch {
    return {
      simulated: true,
      network: c.name,
      action: 'unwrap_wsteth',
      amountWsteth,
      note: 'Dry run — could not estimate conversion. Use the MCP server to execute.',
    };
  }
}

export async function castVote(ctx: Ctx, proposalId: number, support: boolean) {
  const c = getChain(ctx.network, ctx.chainId);
  const proposal = await getProposal(ctx, proposalId);
  return {
    simulated: true,
    network: c.name,
    action: 'cast_vote',
    proposalId,
    vote: support ? 'YEA' : 'NAY',
    proposal,
    note: 'Dry run — voting requires LDO tokens. Use the MCP server to execute.',
  };
}

// ─── Protocol Stats (for sidebar) ────────────────────────────

export async function getProtocolStats(ctx: Ctx) {
  const client = getClient(ctx.network, ctx.chainId);
  const c = getChain(ctx.network, ctx.chainId);

  const [totalSupply, stethPerWsteth] = await Promise.all([
    client.readContract({ address: c.addrs.steth, abi: ERC20_ABI, functionName: 'totalSupply' }),
    client.readContract({ address: c.addrs.wsteth, abi: WSTETH_ABI, functionName: 'stEthPerToken' }),
  ]);

  return {
    totalStaked: formatEther(totalSupply),
    stethPerWsteth: formatEther(stethPerWsteth),
    network: c.name,
    chain: c.id,
  };
}
