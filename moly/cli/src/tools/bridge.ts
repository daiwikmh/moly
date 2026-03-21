import { formatEther, parseEther, parseAbi, type Hex } from 'viem';
import { getRuntime } from '../server/runtime.js';
import { L2_CHAINS } from '../config/types.js';
import type { L2Chain } from '../config/types.js';

const LIFI_BASE = 'https://li.quest/v1';

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

// Native ETH placeholder used by LI.FI
const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as const;

// wstETH on Ethereum L1
const L1_WSTETH = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' as const;

type BridgeToken = 'ETH' | 'wstETH';

function tokenAddress(chain: L2Chain, token: BridgeToken): `0x${string}` {
  if (token === 'ETH') return NATIVE_TOKEN;
  return L2_CHAINS[chain].wstETH;
}

function toTokenAddress(toToken?: string): `0x${string}` {
  if (!toToken || toToken === 'ETH') return NATIVE_TOKEN;
  return L1_WSTETH;
}

function ensureMainnet() {
  const rt = getRuntime();
  if (rt.config.network !== 'mainnet') {
    throw new Error('Bridge tools only work on mainnet. LI.FI does not support testnets.');
  }
}

export async function getL2Balance(sourceChain: L2Chain, address?: string) {
  ensureMainnet();
  const rt = getRuntime();
  const addr = (address ?? rt.getAddress()) as `0x${string}`;
  const client = rt.getL2PublicClient(sourceChain);
  const cfg = L2_CHAINS[sourceChain];

  const [eth, wsteth] = await Promise.all([
    client.getBalance({ address: addr }),
    client.readContract({ address: cfg.wstETH, abi: ERC20_ABI, functionName: 'balanceOf', args: [addr] }),
  ]);

  return {
    address: addr,
    chain: cfg.name,
    chainId: cfg.chainId,
    balances: { ETH: formatEther(eth), wstETH: formatEther(wsteth) },
  };
}

export async function getBridgeQuote(
  sourceChain: L2Chain,
  token: BridgeToken,
  amount: string,
  toToken?: string,
) {
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
    toToken: toToken ?? 'ETH',
    toAmount: formatEther(BigInt(data.estimate?.toAmount ?? '0')),
    estimatedDuration: `${Math.ceil((data.estimate?.executionDuration ?? 0) / 60)} min`,
    gasCosts: data.estimate?.gasCosts ?? [],
    feeCosts: data.estimate?.feeCosts ?? [],
    tool: data.tool,
  };
}

export async function bridgeToEthereum(
  sourceChain: L2Chain,
  token: BridgeToken,
  amount: string,
  toToken?: string,
  dryRun?: boolean,
) {
  ensureMainnet();
  const rt = getRuntime();
  const addr = rt.getAddress();
  const cfg = L2_CHAINS[sourceChain];
  const fromToken = tokenAddress(sourceChain, token);
  const toAddr = toTokenAddress(toToken);
  const fromAmount = parseEther(amount).toString();
  const shouldDryRun = rt.config.mode === 'simulation' ? dryRun !== false : !!dryRun;

  // Fetch quote with full tx data
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
    toToken: toToken ?? 'ETH',
    toAmount: formatEther(BigInt(data.estimate?.toAmount ?? '0')),
    estimatedDuration: `${Math.ceil((data.estimate?.executionDuration ?? 0) / 60)} min`,
    tool: data.tool,
  };

  if (shouldDryRun) {
    return { simulated: true, mode: rt.config.mode, ...quote };
  }

  const wallet = rt.getL2Wallet(sourceChain);
  const client = rt.getL2PublicClient(sourceChain);

  // ERC-20 approval for wstETH
  if (token === 'wstETH' && txReq.to) {
    const allowance = await client.readContract({
      address: cfg.wstETH,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [addr as `0x${string}`, txReq.to as `0x${string}`],
    });
    if (allowance < BigInt(fromAmount)) {
      const approveTx = await wallet.writeContract({
        address: cfg.wstETH,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [txReq.to as `0x${string}`, BigInt(fromAmount)],
      });
      await client.waitForTransactionReceipt({ hash: approveTx });
    }
  }

  // Send bridge tx
  const hash = await wallet.sendTransaction({
    to: txReq.to as `0x${string}`,
    data: txReq.data as Hex,
    value: txReq.value ? BigInt(txReq.value) : 0n,
    gas: txReq.gasLimit ? BigInt(txReq.gasLimit) : undefined,
    chain: undefined,
  });

  return {
    simulated: false,
    mode: rt.config.mode,
    ...quote,
    txHash: hash,
    note: 'Bridge submitted. Use get_bridge_status to track progress (may take 1-20 min).',
  };
}

export async function getBridgeStatus(txHash: string, sourceChain: L2Chain) {
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
    receiving: data.receiving ? { txHash: data.receiving.txHash, amount: data.receiving.amount } : null,
  };
}
