import React from 'react';
import type { VideoTag } from '@core/types';
import { Icon, type IconName } from './Icon';

const TAG_META: Record<VideoTag, { label: string; className: string; icon: IconName }> = {
  LEARNING: { label: '学习', className: 'fm-chip--study', icon: 'book' },
  MUSIC: { label: '音乐', className: 'fm-chip--music', icon: 'music' },
  ENTERTAINMENT: { label: '娱乐', className: 'fm-chip--ent', icon: 'gamepad' },
};

export function TagChip({ tag, showIcon = true }: { tag: VideoTag; showIcon?: boolean }): React.JSX.Element {
  const meta = TAG_META[tag] ?? TAG_META.ENTERTAINMENT;
  return (
    <span className={`fm-chip ${meta.className}`}>
      {showIcon && <Icon name={meta.icon} size={12} />}
      {meta.label}
    </span>
  );
}

export function StatusChip({
  tone,
  icon,
  children,
}: {
  tone: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon?: IconName;
  children: React.ReactNode;
}): React.JSX.Element {
  const color =
    tone === 'success'
      ? 'var(--fm-success)'
      : tone === 'warning'
        ? 'var(--fm-warning)'
        : tone === 'error'
          ? 'var(--fm-error)'
          : tone === 'info'
            ? 'var(--fm-info)'
            : 'var(--fm-text-secondary)';

  return (
    <span
      className="fm-chip"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
