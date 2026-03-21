import { formatEther, parseEther, createPublicClient, http, parseAbi } from 'viem';
import { L2_CHAINS, type Mode, type Network } from './lido-config';

const LIFI_BASE = 'https://li.quest/v1';

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
]);

const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';
const L1_WSTETH = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';

interface Ctx {
  mode: Mode;
  network: Network;
  chainId?: string;
}

function ensureMainnet(ctx: Ctx) {
  if (ctx.network !== 'mainnet') {
    throw new Error('Bridge tools only work on mainnet. LI.FI does not support testnets.');
  }
}

function getL2Client(sourceChain: string) {
  const cfg = L2_CHAINS[sourceChain];
  if (!cfg) throw new Error(`Unknown L2 chain: ${sourceChain}`);
  return { client: createPublicClient({ transport: http(cfg.rpcUrl) }), cfg };
}

export async function getL2Balance(ctx: Ctx, sourceChain: string, address: string) {
  ensureMainnet(ctx);
  const { client, cfg } = getL2Client(sourceChain);
  const addr = address as `0x${string}`;

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

export async function getBridgeQuote(ctx: Ctx, sourceChain: string, token: string, amount: string, toToken?: string) {
  ensureMainnet(ctx);
  const cfg = L2_CHAINS[sourceChain];
  if (!cfg) throw new Error(`Unknown L2 chain: ${sourceChain}`);
  const fromToken = token === 'wstETH' ? cfg.wstETH : NATIVE_TOKEN;
  const toAddr = toToken === 'wstETH' ? L1_WSTETH : NATIVE_TOKEN;
  const fromAmount = parseEther(amount).toString();

  // Use a dummy address for quote-only
  const dummyAddr = '0x0000000000000000000000000000000000000001';
  const url = `${LIFI_BASE}/quote?fromChain=${cfg.chainId}&toChain=1&fromToken=${fromToken}&toToken=${toAddr}&fromAmount=${fromAmount}&fromAddress=${dummyAddr}`;
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
    simulated: true,
    note: 'Quote only. Dashboard cannot broadcast bridge transactions. Use the MCP server or CLI.',
  };
}

export async function bridgeToEthereum(ctx: Ctx, sourceChain: string, token: string, amount: string, toToken?: string) {
  const quote = await getBridgeQuote(ctx, sourceChain, token, amount, toToken);
  return {
    ...quote,
    simulated: true,
    note: 'Dry run. Dashboard cannot broadcast bridge transactions. Use the MCP server or CLI with a private key.',
  };
}

export async function getBridgeStatus(ctx: Ctx, txHash: string, sourceChain: string) {
  ensureMainnet(ctx);
  const cfg = L2_CHAINS[sourceChain];
  if (!cfg) throw new Error(`Unknown L2 chain: ${sourceChain}`);

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
