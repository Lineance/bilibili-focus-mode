import React, { useState } from 'react';

import type { ExtensionConfig, InstantItem } from '@core/types';
import { useSelection } from '@hooks/useSelection';

import { BatchToolbar, ItemCard } from './shared';
import { FuseApplicationDialog } from './FuseApplicationDialog';

export function InstantList({ items, config }: { items: readonly InstantItem[]; config: ExtensionConfig }): React.JSX.Element {
  const allBvids = items.map((item) => item.bvid);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const now = Date.now();

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;

    try {
      const storage = await chrome.storage.local.get();
      const instantList = (storage.instantList || []) as InstantItem[];
      const newInstantList = instantList.filter((item) => item.bvid !== bvid);
      await chrome.storage.local.set({ instantList: newInstantList });

      if (isSelected(bvid)) {
        toggleSelection(bvid);
      }
    } catch (error) {
      console.error('[InstantList] Failed to delete:', error);
      alert('删除失败，请重试');
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;

    try {
      const storage = await chrome.storage.local.get();
      const instantList = (storage.instantList || []) as InstantItem[];
      const newInstantList = instantList.filter((item) => !selected.has(item.bvid));
      await chrome.storage.local.set({ instantList: newInstantList });
      clearSelection();
    } catch (error) {
      console.error('[InstantList] Failed to batch delete:', error);
      alert('批量删除失败，请重试');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空即时许可列表吗？')) return;
    try {
      await chrome.storage.local.set({ instantList: [] });
      clearSelection();
    } catch (error) {
      console.error('[InstantList] Failed to clear list:', error);
      alert('清空失败，请重试');
    }
  };

  const handleApplyFuse = (_bvid: string, _fuseCode: string) => {
    // Fuse code applied successfully, dialog will close
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
          onApply={handleApplyFuse}
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
}
