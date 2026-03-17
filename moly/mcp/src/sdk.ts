import { LidoSDK } from '@lidofinance/lido-ethereum-sdk';
import { createPublicClient, http } from 'viem';
import { config } from './config.js';

const publicClient = createPublicClient({
  chain: config.chain,
  transport: http(config.rpcUrl),
});

let _sdk: LidoSDK | null = null;

export function getSDK(): LidoSDK {
  if (_sdk) return _sdk;

  _sdk = new LidoSDK({
    chainId: config.chainId as 1 | 17000,
    rpcProvider: publicClient,
  });

  return _sdk;
}

export { publicClient };
