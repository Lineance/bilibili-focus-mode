import React from 'react';
import { Icon, type IconName } from './Icon';

export function Card({ className, children }: { className?: string; children: React.ReactNode }): React.JSX.Element {
  return <div className={`fm-card ${className ?? ''}`}>{children}</div>;
}

interface SectionHeaderProps {
  title: string;
  description?: React.ReactNode;
  icon?: IconName;
  count?: number;
  actions?: React.ReactNode;
}

export function SectionHeader({ title, description, icon, count, actions }: SectionHeaderProps): React.JSX.Element {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em]">
          {icon && <span className="text-accent"><Icon name={icon} size={18} /></span>}
          <span>{title}</span>
          {typeof count === 'number' && (
            <span className="ml-1 rounded-full bg-tertiary px-2 py-0.5 font-mono text-[11px] text-tertiary">
              {count}
            </span>
          )}
        </h2>
        {description && <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-tertiary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }): React.JSX.Element {
  return (
    <div className="mb-6">
      <p className="fm-label">{eyebrow}</p>
      <h1 className="mt-1.5 text-[26px]">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-secondary">{description}</p>}
    </div>
  );
}
