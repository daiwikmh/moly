#!/usr/bin/env node
import {
  __require,
  loadConfig,
  saveConfig
} from "./chunk-ELH5VHWX.js";

// src/server/runtime.ts
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { mainnet, base, arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { LidoSDK } from "@lidofinance/lido-ethereum-sdk";

// src/config/types.ts
var L2_CHAINS = {
  base: {
    chainId: 8453,
    name: "Base",
    defaultRpc: "https://mainnet.base.org",
    wstETH: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452"
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    defaultRpc: "https://arb1.arbitrum.io/rpc",
    wstETH: "0x5979D7b546E38E9Ab8049dCFAc0B5D35A8De3f6e"
  }
};
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
var L2_VIEM_CHAINS = { base, arbitrum };
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
  let _resolvedAccount = null;
  function resolveAccount() {
    if (_resolvedAccount) return _resolvedAccount;
    if (config.ows) {
      let exportWallet;
      try {
        exportWallet = __require("@open-wallet-standard/core").exportWallet;
      } catch {
        throw new Error("OWS SDK not installed. Run: npm install @open-wallet-standard/core");
      }
      const exported = exportWallet(config.ows.walletName, config.ows.passphrase);
      const keyHex = exported.secp256k1 ?? exported;
      const pk2 = keyHex.startsWith("0x") ? keyHex : "0x" + keyHex;
      _resolvedAccount = privateKeyToAccount(pk2);
      return _resolvedAccount;
    }
    const pk = config.privateKey;
    if (!pk) throw new Error("No key configured. Run: moly setup");
    _resolvedAccount = privateKeyToAccount(pk);
    return _resolvedAccount;
  }
  function getWallet() {
    if (_wallet) return _wallet;
    const account = resolveAccount();
    _wallet = createWalletClient({
      account,
      chain: viemChain,
      transport: http(rpcUrl)
    });
    return _wallet;
  }
  function getAddress() {
    return resolveAccount().address;
  }
  const _l2Clients = {};
  const _l2Wallets = {};
  function getL2PublicClient(chain) {
    if (_l2Clients[chain]) return _l2Clients[chain];
    const cfg = L2_CHAINS[chain];
    const client = createPublicClient({ chain: L2_VIEM_CHAINS[chain], transport: http(cfg.defaultRpc) });
    _l2Clients[chain] = client;
    return client;
  }
  function getL2Wallet(chain) {
    if (_l2Wallets[chain]) return _l2Wallets[chain];
    const account = resolveAccount();
    const cfg = L2_CHAINS[chain];
    const wallet = createWalletClient({ account, chain: L2_VIEM_CHAINS[chain], transport: http(cfg.defaultRpc) });
    _l2Wallets[chain] = wallet;
    return wallet;
  }
  return {
    config,
    chainAddresses: chainCfg,
    publicClient,
    sdk,
    getWallet,
    getAddress,
    getL2PublicClient,
    getL2Wallet,
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
  if (patch.chain_scope !== void 0) current.chainScope = patch.chain_scope;
  saveConfig(current);
  _runtime = null;
  return current;
}

// src/tools/balance.ts
import { formatEther } from "viem";
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

// src/tools/unstake.ts
import { parseEther, formatEther as formatEther2 } from "viem";
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
      amountOfStETH: formatEther2(s.amountOfStETH),
      amountOfShares: formatEther2(s.amountOfShares),
      owner: s.owner,
      isFinalized: s.isFinalized,
      isClaimed: s.isClaimed
    }))
  };
}

// src/tools/wrap.ts
import { parseEther as parseEther2, formatEther as formatEther3 } from "viem";
async function wrapSteth(amountSteth, dryRun) {
  const rt = getRuntime();
  const amount = parseEther2(amountSteth);
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  const expectedWstETH = await rt.sdk.wrap.convertStethToWsteth(amount);
  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: "wrap_steth",
      amountSteth,
      expectedWstETH: formatEther3(expectedWstETH),
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
    wstethReceived: formatEther3(tx.result?.wstethReceived ?? 0n)
  };
}
async function unwrapWsteth(amountWsteth, dryRun) {
  const rt = getRuntime();
  const amount = parseEther2(amountWsteth);
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  const expectedStETH = await rt.sdk.wrap.convertWstethToSteth(amount);
  if (shouldDryRun) {
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: "unwrap_wsteth",
      amountWsteth,
      expectedStETH: formatEther3(expectedStETH),
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
    stethReceived: formatEther3(tx.result?.stethReceived ?? 0n)
  };
}
async function getConversionRate() {
  const rt = getRuntime();
  const oneEther = parseEther2("1");
  const [wstethPerSteth, stethPerWsteth] = await Promise.all([
    rt.sdk.wrap.convertStethToWsteth(oneEther),
    rt.sdk.wrap.convertWstethToSteth(oneEther)
  ]);
  return {
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    "1_stETH_in_wstETH": formatEther3(wstethPerSteth),
    "1_wstETH_in_stETH": formatEther3(stethPerWsteth),
    note: "wstETH/stETH ratio increases over time as staking rewards accumulate."
  };
}

// src/tools/governance.ts
import { createPublicClient as createPublicClient2, http as http2, parseAbi, formatEther as formatEther4 } from "viem";
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
        yea: formatEther4(v[6]),
        nay: formatEther4(v[7]),
        votingPower: formatEther4(v[8])
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
    yea: formatEther4(v[6]),
    nay: formatEther4(v[7]),
    votingPower: formatEther4(v[8])
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

export {
  L2_CHAINS,
  getRuntime,
  applySettingsUpdate,
  getBalance,
  getRewards,
  requestWithdrawal,
  claimWithdrawals,
  getWithdrawalRequests,
  getWithdrawalStatus,
  wrapSteth,
  unwrapWsteth,
  getConversionRate,
  getProposals,
  getProposal,
  castVote
};
