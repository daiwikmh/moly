'use client';

type Variant = 'green' | 'red' | 'yellow' | 'blue';

export function Badge({ children, variant = 'blue' }: { children: React.ReactNode; variant?: Variant }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
