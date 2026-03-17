'use client';

import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface Props {
  mode: string;
  onRefresh: () => void;
}

export function StakingPanel({ mode, onRefresh }: Props) {
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'stake' | 'wrap' | 'unwrap'>('stake');
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const labels = {
    stake: { placeholder: 'ETH amount', button: 'Stake ETH', param: 'amount_eth' },
    wrap: { placeholder: 'stETH amount', button: 'Wrap to wstETH', param: 'amount_steth' },
    unwrap: { placeholder: 'wstETH amount', button: 'Unwrap to stETH', param: 'amount_wsteth' },
  };

  const handleSubmit = async () => {
    if (!amount) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/lido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amount, dry_run: mode === 'simulation' }),
      });
      const data = await res.json();
      setResult(data);
      onRefresh();
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Actions">
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        {(['stake', 'wrap', 'unwrap'] as const).map((a) => (
          <button
            key={a}
            className={`tab ${action === a ? 'tab-active' : ''}`}
            onClick={() => { setAction(a); setResult(null); }}
          >
            {a.charAt(0).toUpperCase() + a.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          className="input"
          type="number"
          step="0.0001"
          min="0"
          placeholder={labels[action].placeholder}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button onClick={handleSubmit} disabled={submitting || !amount}>
          {submitting ? '...' : labels[action].button}
        </Button>
      </div>

      {mode === 'simulation' && (
        <div style={{ fontSize: '0.75rem', color: 'var(--yellow)', marginBottom: '0.75rem' }}>
          Simulation mode — transactions are dry_run only
        </div>
      )}

      {result && (
        <pre style={{
          fontSize: '0.75rem',
          background: 'var(--bg-input)',
          padding: '0.75rem',
          borderRadius: 'var(--radius)',
          overflow: 'auto',
          maxHeight: '200px',
          color: result.error ? 'var(--red)' : 'var(--text-muted)',
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </Card>
  );
}
