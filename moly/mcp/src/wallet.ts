import { createWalletClient, http, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from './config.js';

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
