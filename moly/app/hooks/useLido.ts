'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMode } from '../context/ModeContext';

interface Balances {
  eth: string;
  steth: string;
  wsteth: string;
}

interface ProtocolStats {
  totalStaked: string;
  stethPerWsteth: string;
  network: string;
  chain: string;
}

interface Proposal {
  id: number;
  open: boolean;
  executed: boolean;
  startDate: string;
  yea: string;
  nay: string;
  votingPower: string;
}

export function useLido(address?: string) {
  const { mode, network, chainId } = useMode();
  const [balances, setBalances] = useState<Balances | null>(null);
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = `mode=${mode}&network=${network}&chainId=${chainId}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, proposalsRes] = await Promise.all([
        fetch(`/api/lido?action=stats&${qs}`),
        fetch(`/api/lido?action=proposals&count=5&${qs}`),
      ]);

      const statsData = await statsRes.json();
      const proposalsData = await proposalsRes.json();

      if (statsRes.ok) setStats(statsData);
      if (proposalsRes.ok) setProposals(proposalsData.proposals ?? []);

      if (address) {
        const balRes = await fetch(`/api/lido?action=balances&address=${address}&${qs}`);
        const balData = await balRes.json();
        if (balRes.ok) {
          if (balData.balances) {
            setBalances({
              eth: balData.balances.eth ?? balData.balances.ETH ?? '0',
              steth: balData.balances.stETH ?? balData.balances.steth ?? '0',
              wsteth: balData.balances.wstETH ?? balData.balances.wsteth ?? '0',
            });
          } else {
            setBalances(balData);
          }
        } else {
          setError(balData.error);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address, qs]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { balances, stats, proposals, loading, error, refresh: fetchData };
}
