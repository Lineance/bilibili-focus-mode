import React from 'react';

export function Progress({
  value,
  max = 100,
  tone = 'accent',
}: {
  value: number;
  max?: number;
  tone?: 'accent' | 'success' | 'warning' | 'error';
}): React.JSX.Element {
  const percent = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100));
  const color =
    tone === 'success'
      ? 'var(--fm-success)'
      : tone === 'warning'
        ? 'var(--fm-warning)'
        : tone === 'error'
          ? 'var(--fm-error)'
          : 'var(--fm-accent-primary)';

  return (
    <div className="fm-progress" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className="fm-progress__bar" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  );
}
