'use client';

import { useState } from 'react';
import { useMode } from '../../context/ModeContext';
import { useLido } from '../../hooks/useLido';
import { BalanceCard } from '../dashboard/BalanceCard';
import { ProtocolStats } from '../dashboard/ProtocolStats';
import { GovernancePanel } from '../dashboard/GovernancePanel';

export function Sidebar() {
  const { mode } = useMode();
  const [address, setAddress] = useState('');
  const [trackedAddress, setTrackedAddress] = useState<string | undefined>();
  const { balances, stats, proposals, loading, error } = useLido(trackedAddress);
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button className="sidebar-toggle sidebar-toggle-collapsed" onClick={() => setCollapsed(false)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Dashboard</span>
        <button className="sidebar-toggle" onClick={() => setCollapsed(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Address input */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Track Address</div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <input
            className="input"
            style={{ fontSize: '0.75rem' }}
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setTrackedAddress(address)}
          />
          <button className="btn btn-secondary btn-sm" onClick={() => setTrackedAddress(address)}>
            Go
          </button>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</div>}
      </div>

      {/* Balances */}
      {trackedAddress && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Balances</div>
          <div className="sidebar-balances">
            <BalanceCard label="ETH" value={balances?.eth ?? null} symbol="ETH" loading={loading} />
            <BalanceCard label="stETH" value={balances?.steth ?? null} symbol="stETH" loading={loading} />
            <BalanceCard label="wstETH" value={balances?.wsteth ?? null} symbol="wstETH" loading={loading} />
          </div>
        </div>
      )}

      {/* Protocol stats */}
      <div className="sidebar-section">
        <ProtocolStats stats={stats} loading={loading} />
      </div>

      {/* Governance */}
      <div className="sidebar-section">
        <GovernancePanel proposals={proposals} loading={loading} />
      </div>
    </div>
  );
}
