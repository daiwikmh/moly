'use client';

import Link from 'next/link';
import { useMode } from '@/app/context/ModeContext';
import { ChatPanel } from '@/app/components/chat/ChatPanel';
import { Sidebar } from '@/app/components/sidebar/Sidebar';

export default function Dashboard() {
  const { mode, toggleMode, network, toggleNetwork, chainId } = useMode();

  return (
    <div className="app-layout">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh' }}>
        <div className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h1>Moly</h1>
            </Link>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '0.5625rem', fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
              Lido Dashboard
            </span>
          </div>
          <div className="app-header-right">
            <div className="mode-toggle" onClick={toggleNetwork}>
              <span className={`mode-toggle-label ${network === 'testnet' ? 'mode-toggle-label-active' : ''}`}>
                Testnet
              </span>
              <div className="mode-toggle-track" data-mode={network === 'mainnet' ? 'live' : 'sim'}>
                <div className="mode-toggle-thumb" />
              </div>
              <span className={`mode-toggle-label ${network === 'mainnet' ? 'mode-toggle-label-active' : ''}`}>
                Mainnet
              </span>
            </div>

            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />

            <div className="mode-toggle" onClick={toggleMode}>
              <span className={`mode-toggle-label ${mode === 'simulation' ? 'mode-toggle-label-active' : ''}`}>
                Sim
              </span>
              <div className="mode-toggle-track" data-mode={mode === 'live' ? 'live' : 'sim'}>
                <div className="mode-toggle-thumb" />
              </div>
              <span className={`mode-toggle-label ${mode === 'live' ? 'mode-toggle-label-active' : ''}`}>
                Live
              </span>
            </div>

            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />

            <Link href="/docs" style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', textDecoration: 'none' }}>
              Docs
            </Link>

            <div className={`mode-pill ${network === 'testnet' ? 'mode-simulation' : 'mode-live'}`}>
              <span className={`pulse-dot ${network === 'testnet' ? 'pulse-dot-yellow' : 'pulse-dot-green'}`} />
              {chainId === 'hoodi' ? 'Hoodi' : 'Ethereum'}
            </div>
          </div>
        </div>

        <ChatPanel />
      </div>

      <Sidebar />
    </div>
  );
}
