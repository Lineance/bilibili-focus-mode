import React from 'react';
import { Button, Icon } from '@ui';

export const BatchToolbar = React.memo(function BatchToolbar({
  selectedCount,
  onSelectAll,
  onDeleteSelected,
  onClearSelection,
  totalCount,
}: {
  selectedCount: number;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  totalCount: number;
}): React.JSX.Element | null {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        className="flex items-center gap-3 rounded-full border border-secondary px-4 py-2 shadow-xl backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--fm-bg-secondary) 96%, transparent)' }}
      >
        <span className="flex items-center gap-1.5 text-[12.5px] text-secondary">
          <Icon name="check" size={14} />
          已选择 <span className="font-mono text-primary">{selectedCount}</span> 项
        </span>
        <div className="h-4 w-px bg-[var(--fm-border-secondary)]" />
        <Button variant="subtle" size="sm" onClick={onSelectAll}>
          全选 ({totalCount})
        </Button>
        <Button variant="subtle" size="sm" onClick={onClearSelection}>
          取消选择
        </Button>
        <Button variant="danger" size="sm" icon="trash" onClick={onDeleteSelected}>
          批量删除
        </Button>
      </div>
    </div>
  );
});
