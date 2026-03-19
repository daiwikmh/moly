#!/usr/bin/env node
import {
  loadConfig,
  redactedConfig,
  saveConfig
} from "./chunk-PIFEXJ56.js";

// src/tools/balance.ts
import { formatEther } from "viem";

// src/server/runtime.ts
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { LidoSDK } from "@lidofinance/lido-ethereum-sdk";

// src/config/types.ts
var CHAIN_CONFIG = {
  hoodi: {
    chainId: 560048,
    stETH: "0x3508A952176b3c15387C97BE809eaffB1982176a",
    wstETH: "0x7E99eE3C66636DE415D2d7C880938F2f40f94De4",
    voting: "0x49B3512c44891bef83F8967d075121Bd1b07a01B",
    defaultRpc: "https://hoodi.drpc.org",
    name: "Hoodi Testnet"
  },
  mainnet: {
    chainId: 1,
    stETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    voting: "0x2e59A20f205bB85a89C53f1936454680651E618e",
    defaultRpc: "https://eth.llamarpc.com",
    name: "Ethereum Mainnet"
  }
};

// src/server/runtime.ts
var hoodi = defineChain({
  id: 560048,
  name: "Hoodi Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://hoodi.drpc.org"] } }
});
var _runtime = null;
function buildRuntime() {
  const config = loadConfig();
  const chainCfg = CHAIN_CONFIG[config.network];
  const rpcUrl = config.rpc ?? chainCfg.defaultRpc;
  const viemChain = config.network === "mainnet" ? mainnet : hoodi;
  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(rpcUrl)
  });
  const sdk = new LidoSDK({
    chainId: chainCfg.chainId,
    rpcProvider: publicClient
  });
  let _wallet = null;
  function getWallet() {
    if (_wallet) return _wallet;
    const pk = config.privateKey;
    if (!pk) throw new Error("No private key configured. Run: moly setup");
    const account = privateKeyToAccount(pk);
    _wallet = createWalletClient({
      account,
      chain: viemChain,
      transport: http(rpcUrl)
    });
    return _wallet;
  }
  function getAddress() {
    const pk = config.privateKey;
    if (!pk) throw new Error("No private key configured. Run: moly setup");
    return privateKeyToAccount(pk).address;
  }
  return {
    config,
    chainAddresses: chainCfg,
    publicClient,
    sdk,
    getWallet,
    getAddress,
    reload() {
      _runtime = null;
    }
  };
}
function getRuntime() {
  if (!_runtime) _runtime = buildRuntime();
  return _runtime;
}
function applySettingsUpdate(patch) {
  const current = loadConfig();
  if (patch.network !== void 0) current.network = patch.network;
  if (patch.mode !== void 0) current.mode = patch.mode;
  if (patch.rpc !== void 0) current.rpc = patch.rpc;
  if (patch.model !== void 0 && current.ai) current.ai.model = patch.model;
  saveConfig(current);
  _runtime = null;
  return current;
}

// src/tools/balance.ts
async function getBalance(address) {
  const rt = getRuntime();
  const addr = address ?? rt.getAddress();
  const [eth, steth, wsteth] = await Promise.all([
    rt.sdk.core.balanceETH(addr),
    rt.sdk.steth.balance(addr),
    rt.sdk.wsteth.balance(addr)
  ]);
  return {
    address: addr,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    balances: {
      eth: formatEther(eth),
      stETH: formatEther(steth),
      wstETH: formatEther(wsteth)
    }
  };
}
async function getRewards(address, days = 7) {
  const rt = getRuntime();
  const addr = address ?? rt.getAddress();
  const rewards = await rt.sdk.rewards.getRewardsFromChain({
    address: addr,
    stepBlock: 1e3,
    back: { days: BigInt(days) }
  });
  return {
    address: addr,
    period: `${days} days`,
    totalRewards: formatEther(rewards.totalRewards),
    baseBalance: formatEther(rewards.baseBalance),
    rewards: rewards.rewards.slice(0, 10).map((e) => ({
      type: e.type,
      change: formatEther(e.change),
      balance: formatEther(e.balance)
    }))
  };
}

// src/tools/stake.ts
import { parseEther, formatEther as formatEther2 } from "viem";
var SUBMIT_ABI = [
  {
    name: "submit",
    type: "function",
    inputs: [{ name: "_referral", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "payable"
  }
];
var REFERRAL = "0x0000000000000000000000000000000000000000";
async function stakeEth(amountEth, dryRun) {
  const rt = getRuntime();
  const value = parseEther(amountEth);
  const account = rt.getAddress();
  const lidoAddress = rt.chainAddresses.stETH;
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  if (shouldDryRun) {
    let estimatedGas = "unavailable";
    try {
      const gas = await rt.publicClient.estimateContractGas({
        address: lidoAddress,
        abi: SUBMIT_ABI,
        functionName: "submit",
        args: [REFERRAL],
        value,
        account: "0x0000000000000000000000000000000000000001"
      });
      estimatedGas = gas.toString();
    } catch {
    }
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: "stake",
      amountEth,
      estimatedGas,
      expectedStETH: amountEth,
      note: "stETH rebases daily \u2014 your balance grows automatically after staking."
    };
  }
  const tx = await rt.sdk.stake.stakeEth({
    value,
    account: { address: account },
    callback: () => {
    }
  });
  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: "stake",
    amountEth,
    txHash: tx.hash,
    stethReceived: formatEther2(tx.result?.stethReceived ?? 0n),
    sharesReceived: formatEther2(tx.result?.sharesReceived ?? 0n)
  };
}

// src/tools/unstake.ts
import { parseEther as parseEther2, formatEther as formatEther3 } from "viem";
async function requestWithdrawal(amountSteth, dryRun) {
  const rt = getRuntime();
  const amount = parseEther2(amountSteth);
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
      amountOfStETH: formatEther3(s.amountOfStETH),
      amountOfShares: formatEther3(s.amountOfShares),
      owner: s.owner,
      isFinalized: s.isFinalized,
      isClaimed: s.isClaimed
    }))
  };
}

// src/tools/wrap.ts
import { parseEther as parseEther3, formatEther as formatEther4 } from "viem";
async function wrapSteth(amountSteth, dryRun) {
  const rt = getRuntime();
  const amount = parseEther3(amountSteth);
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  const expectedWstETH = await rt.sdk.wrap.convertStethToWsteth(amount);
  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: "wrap_steth",
      amountSteth,
      expectedWstETH: formatEther4(expectedWstETH),
      note: "wstETH is non-rebasing \u2014 balance stays fixed while value grows. Better for DeFi."
    };
  }
  const account = rt.getAddress();
  const tx = await rt.sdk.wrap.wrapSteth({
    value: amount,
    account,
    callback: () => {
    }
  });
  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: "wrap_steth",
    amountSteth,
    txHash: tx.hash,
    wstethReceived: formatEther4(tx.result?.wstethReceived ?? 0n)
  };
}
async function unwrapWsteth(amountWsteth, dryRun) {
  const rt = getRuntime();
  const amount = parseEther3(amountWsteth);
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  const expectedStETH = await rt.sdk.wrap.convertWstethToSteth(amount);
  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: "unwrap_wsteth",
      amountWsteth,
      expectedStETH: formatEther4(expectedStETH),
      note: "Unwrapping gives rebasing stETH back. Balance updates daily with rewards."
    };
  }
  const account = rt.getAddress();
  const tx = await rt.sdk.wrap.unwrap({
    value: amount,
    account,
    callback: () => {
    }
  });
  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: "unwrap_wsteth",
    amountWsteth,
    txHash: tx.hash,
    stethReceived: formatEther4(tx.result?.stethReceived ?? 0n)
  };
}
async function getConversionRate() {
  const rt = getRuntime();
  const oneEther = parseEther3("1");
  const [wstethPerSteth, stethPerWsteth] = await Promise.all([
    rt.sdk.wrap.convertStethToWsteth(oneEther),
    rt.sdk.wrap.convertWstethToSteth(oneEther)
  ]);
  return {
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    "1_stETH_in_wstETH": formatEther4(wstethPerSteth),
    "1_wstETH_in_stETH": formatEther4(stethPerWsteth),
    note: "wstETH/stETH ratio increases over time as staking rewards accumulate."
  };
}

// src/tools/governance.ts
import { createPublicClient as createPublicClient2, http as http2, parseAbi, formatEther as formatEther5 } from "viem";
import { mainnet as mainnet2 } from "viem/chains";
import { defineChain as defineChain2 } from "viem";
var hoodi2 = defineChain2({
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
  const viemChain = rt.config.network === "mainnet" ? mainnet2 : hoodi2;
  const client = createPublicClient2({ chain: viemChain, transport: http2(rpcUrl) });
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
        yea: formatEther5(v[6]),
        nay: formatEther5(v[7]),
        votingPower: formatEther5(v[8])
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
  const viemChain = rt.config.network === "mainnet" ? mainnet2 : hoodi2;
  const client = createPublicClient2({ chain: viemChain, transport: http2(rpcUrl) });
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
    yea: formatEther5(v[6]),
    nay: formatEther5(v[7]),
    votingPower: formatEther5(v[8])
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
  const viemChain = rt.config.network === "mainnet" ? mainnet2 : hoodi2;
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

// src/tools/settings.ts
function getSettings() {
  const cfg = loadConfig();
  return {
    ...redactedConfig(cfg),
    note: "Use update_settings to change mode, network, or rpc. Private key and API keys can only be changed via: moly setup"
  };
}
function updateSettings(patch) {
  if (Object.keys(patch).length === 0) {
    return { error: "No settings provided to update." };
  }
  const updated = applySettingsUpdate(patch);
  return {
    updated: true,
    changes: patch,
    current: redactedConfig(updated),
    note: "Settings saved and applied. SDK reinitialized with new config."
  };
}

export {
  getBalance,
  getRewards,
  stakeEth,
  requestWithdrawal,
  claimWithdrawals,
  getWithdrawalRequests,
  getWithdrawalStatus,
  wrapSteth,
  unwrapWsteth,
  getConversionRate,
  getProposals,
  getProposal,
  castVote,
  getSettings,
  updateSettings
};
