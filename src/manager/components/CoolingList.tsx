import React from 'react';

import type { CoolingItem } from '@core/types';
import { useNow } from '@hooks/useNow';
import { useSelection } from '@hooks/useSelection';
import { useStorageActions } from '../hooks/useStorageActions';

import { BatchToolbar, ItemCard } from './shared';

export const CoolingList = React.memo(function CoolingList({ items }: { items: readonly CoolingItem[] }): React.JSX.Element {
  const allBvids = items.map((item) => item.bvid);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const { deleteFromList, batchDelete, clearList } = useStorageActions();
  const now = useNow(60000);

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;
    const success = await deleteFromList('coolingList', bvid);
    if (!success) { alert('删除失败，请重试'); return; }
    if (isSelected(bvid)) toggleSelection(bvid);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;
    const success = await batchDelete('coolingList', selected);
    if (!success) alert('批量删除失败，请重试');
    else clearSelection();
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空冷静期列表吗？')) return;
    const success = await clearList('coolingList');
    if (!success) alert('清空失败，请重试');
    else clearSelection();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">冷静期 ({items.length})</h2>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            清空列表
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-muted">没有处于冷静期的视频</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const isAvailable = now >= item.availableAt;
            const isExpired = now >= item.expiresAt;

            return (
              <ItemCard
                key={item.bvid}
                item={item}
                selected={selected.has(item.bvid)}
                onSelect={() => toggleSelection(item.bvid)}
                onDelete={() => handleDelete(item.bvid)}
              >
                <p className={`text-sm mt-2 ${isExpired ? 'text-error' : isAvailable ? 'text-success' : 'text-warning'}`}>
                  {isExpired
                    ? '已过期'
                    : isAvailable
                      ? '可观看'
                      : `还需等待 ${Math.ceil((item.availableAt - now) / 3600000)} 小时`}
                </p>
              </ItemCard>
            );
          })}
        </div>
      )}

      <BatchToolbar
        selectedCount={selected.size}
        onSelectAll={selectAll}
        onDeleteSelected={handleBatchDelete}
        onClearSelection={clearSelection}
        totalCount={items.length}
      />
    </div>
  );
});
