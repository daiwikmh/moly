'use client';

import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface Proposal {
  id: number;
  open: boolean;
  executed: boolean;
  startDate: string;
  yea: string;
  nay: string;
  votingPower: string;
}

export function GovernancePanel({ proposals, loading }: { proposals: Proposal[]; loading: boolean }) {
  if (loading) {
    return (
      <Card title="Governance">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: '3.5rem' }} />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card title="Governance">
      {proposals.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No proposals found</div>
      ) : (
        proposals.map((p) => {
          const total = Number(p.yea) + Number(p.nay);
          const yeaPct = total > 0 ? ((Number(p.yea) / total) * 100).toFixed(1) : '0';

          return (
            <div key={p.id} className="proposal-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="proposal-id">#{p.id}</span>
                {p.open ? (
                  <Badge variant="green">Open</Badge>
                ) : p.executed ? (
                  <Badge variant="blue">Executed</Badge>
                ) : (
                  <Badge variant="red">Closed</Badge>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {new Date(p.startDate).toLocaleDateString()}
              </div>
              <div className="proposal-votes">
                <span className="vote-yea">{yeaPct}% yea</span>
                <span className="vote-nay">{(100 - Number(yeaPct)).toFixed(1)}% nay</span>
              </div>
            </div>
          );
        })
      )}
    </Card>
  );
}
