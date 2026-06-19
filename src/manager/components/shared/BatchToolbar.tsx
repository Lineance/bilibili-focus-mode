import React from 'react';

export function BatchToolbar({
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
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-secondary border border-secondary rounded-lg px-6 py-3 flex items-center gap-4 shadow-lg z-50">
      <span className="text-sm">已选择 {selectedCount} 项</span>
      <div className="flex gap-2">
        <button
          onClick={onSelectAll}
          className="px-3 py-1 bg-tertiary border border-secondary rounded text-sm hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          全选 ({totalCount})
        </button>
        <button
          onClick={onClearSelection}
          className="px-3 py-1 bg-tertiary border border-secondary rounded text-sm hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          取消选择
        </button>
        <button
          onClick={onDeleteSelected}
          className="px-3 py-1 bg-error text-white rounded text-sm hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          批量删除
        </button>
      </div>
    </div>
  );
}
