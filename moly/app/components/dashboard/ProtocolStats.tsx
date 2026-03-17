'use client';

import { Card } from '../ui/Card';

interface Stats {
  totalStaked: string;
  stethPerWsteth: string;
  network: string;
  chain?: string;
}

export function ProtocolStats({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const rows = stats
    ? [
        { label: 'Total Staked', value: `${Number(stats.totalStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH` },
        { label: 'stETH per wstETH', value: Number(stats.stethPerWsteth).toFixed(4) },
        { label: 'Network', value: stats.network },
      ]
    : [];

  return (
    <Card title="Protocol">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: '1.25rem' }} />
          ))}
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.label} className="stat-row">
            <span className="stat-label">{r.label}</span>
            <span className="stat-value">{r.value}</span>
          </div>
        ))
      )}
    </Card>
  );
}
