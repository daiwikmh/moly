#!/usr/bin/env node
import {
  L2_CHAINS,
  getBalance,
  getConversionRate,
  getRuntime
} from "./chunk-Y3MG4RMT.js";

// src/tools/bridge.ts
import { formatEther, parseEther, parseAbi } from "viem";
var LIFI_BASE = "https://li.quest/v1";
var ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
]);
var NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";
var L1_WSTETH = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
function tokenAddress(chain, token) {
  if (token === "ETH") return NATIVE_TOKEN;
  return L2_CHAINS[chain].wstETH;
}
function toTokenAddress(toToken) {
  if (!toToken || toToken === "ETH") return NATIVE_TOKEN;
  return L1_WSTETH;
}
function ensureMainnet() {
  const rt = getRuntime();
  if (rt.config.network !== "mainnet") {
    throw new Error("Bridge tools only work on mainnet. LI.FI does not support testnets.");
  }
}
async function getL2Balance(sourceChain, address) {
  ensureMainnet();
  const rt = getRuntime();
  const addr = address ?? rt.getAddress();
  const client = rt.getL2PublicClient(sourceChain);
  const cfg = L2_CHAINS[sourceChain];
  const [eth, wsteth] = await Promise.all([
    client.getBalance({ address: addr }),
    client.readContract({ address: cfg.wstETH, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] })
  ]);
  return {
    address: addr,
    chain: cfg.name,
    chainId: cfg.chainId,
    balances: { ETH: formatEther(eth), wstETH: formatEther(wsteth) }
  };
}
async function getBridgeQuote(sourceChain, token, amount, toToken) {
  ensureMainnet();
  const rt = getRuntime();
  const addr = rt.getAddress();
  const cfg = L2_CHAINS[sourceChain];
  const fromToken = tokenAddress(sourceChain, token);
  const toAddr = toTokenAddress(toToken);
  const fromAmount = parseEther(amount).toString();
  const url = `${LIFI_BASE}/quote?fromChain=${cfg.chainId}&toChain=1&fromToken=${fromToken}&toToken=${toAddr}&fromAmount=${fromAmount}&fromAddress=${addr}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LI.FI quote failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return {
    sourceChain: cfg.name,
    token,
    amount,
    toToken: toToken ?? "ETH",
    toAmount: formatEther(BigInt(data.estimate?.toAmount ?? "0")),
    estimatedDuration: `${Math.ceil((data.estimate?.executionDuration ?? 0) / 60)} min`,
    gasCosts: data.estimate?.gasCosts ?? [],
    feeCosts: data.estimate?.feeCosts ?? [],
    tool: data.tool
  };
}
async function bridgeToEthereum(sourceChain, token, amount, toToken, dryRun) {
  ensureMainnet();
  const rt = getRuntime();
  const addr = rt.getAddress();
  const cfg = L2_CHAINS[sourceChain];
  const fromToken = tokenAddress(sourceChain, token);
  const toAddr = toTokenAddress(toToken);
  const fromAmount = parseEther(amount).toString();
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  const url = `${LIFI_BASE}/quote?fromChain=${cfg.chainId}&toChain=1&fromToken=${fromToken}&toToken=${toAddr}&fromAmount=${fromAmount}&fromAddress=${addr}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LI.FI quote failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  const txReq = data.transactionRequest;
  const quote = {
    sourceChain: cfg.name,
    token,
    amount,
    toToken: toToken ?? "ETH",
    toAmount: formatEther(BigInt(data.estimate?.toAmount ?? "0")),
    estimatedDuration: `${Math.ceil((data.estimate?.executionDuration ?? 0) / 60)} min`,
    tool: data.tool
  };
  if (shouldDryRun) {
    return { simulated: true, mode: rt.config.mode, ...quote };
  }
  const wallet = rt.getL2Wallet(sourceChain);
  const client = rt.getL2PublicClient(sourceChain);
  if (token === "wstETH" && txReq.to) {
    const allowance = await client.readContract({
      address: cfg.wstETH,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [addr, txReq.to]
    });
    if (allowance < BigInt(fromAmount)) {
      const approveTx = await wallet.writeContract({
        address: cfg.wstETH,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [txReq.to, BigInt(fromAmount)]
      });
      await client.waitForTransactionReceipt({ hash: approveTx });
    }
  }
  const hash = await wallet.sendTransaction({
    to: txReq.to,
    data: txReq.data,
    value: txReq.value ? BigInt(txReq.value) : 0n,
    gas: txReq.gasLimit ? BigInt(txReq.gasLimit) : void 0,
    chain: void 0
  });
  return {
    simulated: false,
    mode: rt.config.mode,
    ...quote,
    txHash: hash,
    note: "Bridge submitted. Use get_bridge_status to track progress (may take 1-20 min)."
  };
}
async function getBridgeStatus(txHash, sourceChain) {
  ensureMainnet();
  const cfg = L2_CHAINS[sourceChain];
  const url = `${LIFI_BASE}/status?txHash=${txHash}&fromChain=${cfg.chainId}&toChain=1`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LI.FI status failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return {
    txHash,
    sourceChain: cfg.name,
    status: data.status,
    substatus: data.substatus ?? null,
    sending: data.sending ? { txHash: data.sending.txHash, amount: data.sending.amount } : null,
    receiving: data.receiving ? { txHash: data.receiving.txHash, amount: data.receiving.amount } : null
  };
}

// src/tools/position.ts
async function getTotalPosition(address) {
  const rt = getRuntime();
  const addr = address ?? rt.getAddress();
  const isMainnet = rt.config.network === "mainnet";
  const l1 = await getBalance(addr);
  const rate = await getConversionRate();
  const wstethToEth = parseFloat(rate["1_wstETH_in_stETH"]);
  const l1Eth = parseFloat(l1.balances.eth);
  const l1Steth = parseFloat(l1.balances.stETH);
  const l1Wsteth = parseFloat(l1.balances.wstETH);
  const l1WstethInEth = l1Wsteth * wstethToEth;
  const positions = {
    ethereum: {
      eth: l1.balances.eth,
      stETH: l1.balances.stETH,
      wstETH: l1.balances.wstETH,
      ethEquivalent: (l1Eth + l1Steth + l1WstethInEth).toFixed(6)
    }
  };
  let totalEthEquiv = l1Eth + l1Steth + l1WstethInEth;
  if (isMainnet) {
    for (const chain of ["base", "arbitrum"]) {
      try {
        const l2 = await getL2Balance(chain, addr);
        const l2Eth = parseFloat(l2.balances.ETH);
        const l2Wsteth = parseFloat(l2.balances.wstETH);
        const l2WstethInEth = l2Wsteth * wstethToEth;
        positions[chain] = {
          eth: l2.balances.ETH,
          wstETH: l2.balances.wstETH,
          ethEquivalent: (l2Eth + l2WstethInEth).toFixed(6)
        };
        totalEthEquiv += l2Eth + l2WstethInEth;
      } catch {
        positions[chain] = { error: "failed to fetch" };
      }
    }
  }
  return {
    address: addr,
    network: rt.chainAddresses.name,
    conversionRate: rate["1_wstETH_in_stETH"],
    positions,
    totalEthEquivalent: totalEthEquiv.toFixed(6),
    note: isMainnet ? "Includes Ethereum + Base + Arbitrum" : "Testnet: Ethereum only"
  };
}

export {
  getL2Balance,
  getBridgeQuote,
  bridgeToEthereum,
  getBridgeStatus,
  getTotalPosition
};
