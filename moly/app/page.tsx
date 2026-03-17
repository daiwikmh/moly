'use client';

import { useMode } from './context/ModeContext';
import { ChatPanel } from './components/chat/ChatPanel';
import { Sidebar } from './components/sidebar/Sidebar';

export default function Home() {
  const { mode, toggleMode, network, toggleNetwork, chainId } = useMode();

  return (
    <div className="app-layout">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh' }}>
        {/* Header */}
        <div className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1>Moly</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Lido MCP Dashboard</span>
          </div>
          <div className="app-header-right">
            {/* Network toggle: Testnet / Mainnet */}
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

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

            {/* Mode toggle: Simulation / Live */}
            <div className="mode-toggle" onClick={toggleMode}>
              <span className={`mode-toggle-label ${mode === 'simulation' ? 'mode-toggle-label-active' : ''}`}>
                Simulation
              </span>
              <div className="mode-toggle-track" data-mode={mode === 'live' ? 'live' : 'sim'}>
                <div className="mode-toggle-thumb" />
              </div>
              <span className={`mode-toggle-label ${mode === 'live' ? 'mode-toggle-label-active' : ''}`}>
                Live
              </span>
            </div>

            {/* Chain pill */}
            <div className={`mode-pill ${network === 'testnet' ? 'mode-simulation' : 'mode-live'}`}>
              <span className={`pulse-dot ${network === 'testnet' ? 'pulse-dot-yellow' : 'pulse-dot-green'}`} />
              {chainId === 'hoodi' ? 'Hoodi' : 'Ethereum'}
            </div>
          </div>
        </div>

        {/* Chat */}
        <ChatPanel />
      </div>

      {/* Sidebar */}
      <Sidebar />
    </div>
  );
}
