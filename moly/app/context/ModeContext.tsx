'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { type Mode, type Network } from '@/lib/lido-config';

interface ModeContextValue {
  mode: Mode;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
  network: Network;
  setNetwork: (n: Network) => void;
  toggleNetwork: () => void;
  chainId: string;
  setChainId: (c: string) => void;
}

const ModeContext = createContext<ModeContextValue>({
  mode: 'simulation',
  setMode: () => {},
  toggleMode: () => {},
  network: 'testnet',
  setNetwork: () => {},
  toggleNetwork: () => {},
  chainId: 'hoodi',
  setChainId: () => {},
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('simulation');
  const [network, setNetwork] = useState<Network>('testnet');
  const [chainId, setChainId] = useState('hoodi');

  const toggleMode = () => setMode((m) => (m === 'simulation' ? 'live' : 'simulation'));
  const toggleNetwork = () => {
    setNetwork((n) => {
      const next = n === 'testnet' ? 'mainnet' : 'testnet';
      setChainId(next === 'testnet' ? 'hoodi' : 'ethereum');
      return next;
    });
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode, network, setNetwork, toggleNetwork, chainId, setChainId }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
