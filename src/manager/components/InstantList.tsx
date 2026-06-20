import React, { useState, useEffect } from 'react';

import type { ExtensionConfig, InstantItem } from '@core/types';
import { useSelection } from '@hooks/useSelection';
import { useStorageActions } from '../hooks/useStorageActions';

import { BatchToolbar, ItemCard } from './shared';
import { FuseApplicationDialog } from './FuseApplicationDialog';

export const InstantList = React.memo(function InstantList({ items, config }: { items: readonly InstantItem[]; config: ExtensionConfig }): React.JSX.Element {
  const allBvids = items.map((item) => item.bvid);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const { deleteFromList, batchDelete, clearList } = useStorageActions();
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;
    const success = await deleteFromList('instantList', bvid);
    if (!success) { alert('删除失败，请重试'); return; }
    if (isSelected(bvid)) toggleSelection(bvid);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;
    const success = await batchDelete('instantList', selected);
    if (!success) alert('批量删除失败，请重试');
    else clearSelection();
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空即时许可列表吗？')) return;
    const success = await clearList('instantList');
    if (!success) alert('清空失败，请重试');
    else clearSelection();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">即时许可 ({items.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowApplyDialog(true)}
            className="px-3 py-1 bg-accent-primary rounded text-sm hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            申请熔断码
          </button>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
            >
              清空列表
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted">没有即时许可</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const isExpired = now >= item.expiresAt;
            const hoursLeft = Math.ceil((item.expiresAt - now) / 3600000);

            return (
              <ItemCard
                key={item.bvid}
                item={item}
                selected={selected.has(item.bvid)}
                onSelect={() => toggleSelection(item.bvid)}
                onDelete={() => handleDelete(item.bvid)}
              >
                <p className={`text-sm mt-2 ${isExpired ? 'text-error' : 'text-success'}`}>
                  {isExpired ? '已过期' : `剩余 ${hoursLeft} 小时`}
                </p>
              </ItemCard>
            );
          })}
        </div>
      )}

      {showApplyDialog && (
        <FuseApplicationDialog
          instantDurationHours={config.instantDurationHours}
          onApply={() => {}}
          onClose={() => setShowApplyDialog(false)}
        />
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
