import React from 'react';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon = 'spark',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="fm-empty">
      <div className="mb-3 flex justify-center text-muted">
        <Icon name={icon} size={22} />
      </div>
      <p className="text-[13px] font-medium text-secondary">{title}</p>
      {description && <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
