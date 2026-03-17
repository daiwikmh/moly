import { holesky, mainnet } from 'viem/chains';

export type Mode = 'simulation' | 'live';

const mode = (process.env.LIDO_MODE ?? 'simulation') as Mode;

if (mode !== 'simulation' && mode !== 'live') {
  throw new Error(`LIDO_MODE must be "simulation" or "live", got: ${mode}`);
}

export const config = {
  mode,
  isSimulation: mode === 'simulation',
  chain: mode === 'simulation' ? holesky : mainnet,
  chainId: mode === 'simulation' ? 17000 : 1,
  rpcUrl:
    mode === 'simulation'
      ? (process.env.HOLESKY_RPC_URL ?? 'https://ethereum-holesky-rpc.publicnode.com')
      : (process.env.MAINNET_RPC_URL ?? 'https://eth.llamarpc.com'),
  referralAddress: (process.env.REFERRAL_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
};
