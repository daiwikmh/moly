'use client';

import { Card } from '../ui/Card';

interface Props {
  label: string;
  value: string | null;
  symbol: string;
  loading: boolean;
}

export function BalanceCard({ label, value, symbol, loading }: Props) {
  return (
    <Card>
      <div className="balance-label">{label}</div>
      {loading ? (
        <div className="skeleton" style={{ width: '60%', height: '2rem', marginTop: '0.5rem' }} />
      ) : (
        <>
          <div className="balance-value">
            {value ? Number(value).toFixed(4) : '0.0000'}
          </div>
          <div className="balance-sub">{symbol}</div>
        </>
      )}
    </Card>
  );
}
