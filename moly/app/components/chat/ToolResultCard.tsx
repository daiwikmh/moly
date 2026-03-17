'use client';

interface Props {
  toolName: string;
  result: any;
}

function formatValue(val: any): string {
  if (typeof val === 'number') return val.toLocaleString();
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string') {
    // Format large decimal strings
    if (/^\d+\.\d{6,}$/.test(val)) return Number(val).toFixed(4);
    return val;
  }
  return JSON.stringify(val);
}

const TOOL_LABELS: Record<string, string> = {
  get_balance: 'Balances',
  get_rewards: 'Rewards',
  get_conversion_rate: 'Conversion Rate',
  get_withdrawal_requests: 'Withdrawal Requests',
  get_withdrawal_status: 'Withdrawal Status',
  get_proposals: 'Governance Proposals',
  get_proposal: 'Proposal Details',
  stake_eth: 'Stake ETH (Simulation)',
  request_withdrawal: 'Request Withdrawal (Simulation)',
  claim_withdrawals: 'Claim Withdrawals (Simulation)',
  wrap_steth: 'Wrap stETH (Simulation)',
  unwrap_wsteth: 'Unwrap wstETH (Simulation)',
  cast_vote: 'Cast Vote (Simulation)',
};

export function ToolResultCard({ toolName, result }: Props) {
  if (!result) return null;

  const label = TOOL_LABELS[toolName] ?? toolName;

  // Special rendering for balances
  if (toolName === 'get_balance' && result.balances) {
    return (
      <div className="tool-card">
        <div className="tool-card-header">{label}</div>
        <div className="tool-card-grid">
          {Object.entries(result.balances).map(([key, val]) => (
            <div key={key} className="tool-card-stat">
              <span className="tool-card-stat-label">{key}</span>
              <span className="tool-card-stat-value">{Number(val as string).toFixed(4)}</span>
            </div>
          ))}
        </div>
        <div className="tool-card-meta">{result.network} · {result.mode}</div>
      </div>
    );
  }

  // Special rendering for proposals list
  if (toolName === 'get_proposals' && result.proposals) {
    return (
      <div className="tool-card">
        <div className="tool-card-header">{label} ({result.total} total)</div>
        {result.proposals.map((p: any) => (
          <div key={p.id} className="tool-card-proposal">
            <span className="tool-card-proposal-id">#{p.id}</span>
            <span className={p.open ? 'badge badge-green' : p.executed ? 'badge badge-blue' : 'badge badge-red'}>
              {p.open ? 'Open' : p.executed ? 'Executed' : 'Closed'}
            </span>
            <span className="tool-card-proposal-votes">
              <span className="vote-yea">{Number(p.yea).toFixed(0)} yea</span>
              <span className="vote-nay">{Number(p.nay).toFixed(0)} nay</span>
            </span>
          </div>
        ))}
        {result.error && <div className="tool-card-meta" style={{ color: 'var(--yellow)' }}>{result.error}</div>}
      </div>
    );
  }

  // Special rendering for simulation results
  if (result.simulated) {
    return (
      <div className="tool-card tool-card-sim">
        <div className="tool-card-header">{label}</div>
        <div className="tool-card-body">
          {Object.entries(result)
            .filter(([k]) => !['simulated', 'mode', 'action', 'network'].includes(k))
            .map(([key, val]) => {
              if (key === 'proposal') return null;
              if (key === 'note') return <div key={key} className="tool-card-note">{val as string}</div>;
              return (
                <div key={key} className="tool-card-row">
                  <span className="tool-card-row-label">{key.replace(/_/g, ' ')}</span>
                  <span className="tool-card-row-value">{formatValue(val)}</span>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  // Default: JSON fallback
  return (
    <div className="tool-card">
      <div className="tool-card-header">{label}</div>
      <pre className="tool-card-json">{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
