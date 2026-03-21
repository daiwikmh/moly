import { createWalletClient, createPublicClient, http, type WalletClient, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config, L2_CHAINS } from './config.js';
import type { L2Chain } from './config.js';

let _wallet: WalletClient | null = null;

export function getWallet(): WalletClient {
  if (_wallet) return _wallet;

  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY env var is required');

  const account = privateKeyToAccount(pk as `0x${string}`);
  _wallet = createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  return _wallet;
}

export function getAddress(): `0x${string}` {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY env var is required');
  return privateKeyToAccount(pk as `0x${string}`).address;
}

const _l2Wallets: Partial<Record<L2Chain, WalletClient>> = {};
const _l2Clients: Partial<Record<L2Chain, PublicClient>> = {};

export function getL2Wallet(chain: L2Chain): WalletClient {
  if (_l2Wallets[chain]) return _l2Wallets[chain]!;
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY env var is required');
  const account = privateKeyToAccount(pk as `0x${string}`);
  const cfg = L2_CHAINS[chain];
  const w = createWalletClient({ account, chain: cfg.viemChain, transport: http(cfg.defaultRpc) });
  _l2Wallets[chain] = w;
  return w;
}

export function getL2PublicClient(chain: L2Chain): PublicClient {
  if (_l2Clients[chain]) return _l2Clients[chain]!;
  const cfg = L2_CHAINS[chain];
  const c = createPublicClient({ chain: cfg.viemChain, transport: http(cfg.defaultRpc) });
  _l2Clients[chain] = c;
  return c;
}
