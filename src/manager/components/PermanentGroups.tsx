import React from 'react';
import type { PermanentGroup } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';
import { useSelection } from '@hooks/useSelection';

import { BatchToolbar, ItemCard } from './shared';

export function PermanentGroups({ groups }: { groups: readonly PermanentGroup[] }): React.JSX.Element {
  // Flatten all items from all groups and separate by tag
  const allItems = groups.flatMap(group => group.items);
  const allBvids = allItems.map((item) => item.bvid);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const learningItems = allItems.filter(item => item.tag === 'LEARNING');
  const musicItems = allItems.filter(item => item.tag === 'MUSIC');
  const entertainmentItems = allItems.filter(item => item.tag === 'ENTERTAINMENT');
  const totalItems = allItems.length;

  const handleDeleteItem = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;

    try {
      const { permanentGroups } = await StorageRepository.getKeys('permanentGroups');

      // Remove item from whichever group it belongs to
      const updatedGroups = permanentGroups.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.bvid !== bvid),
      }));

      await StorageRepository.set({ permanentGroups: updatedGroups });

      if (isSelected(bvid)) {
        toggleSelection(bvid);
      }
    } catch (error) {
      console.error('[PermanentGroups] Failed to delete item:', error);
      alert('删除失败，请重试');
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;

    try {
      const { permanentGroups } = await StorageRepository.getKeys('permanentGroups');

      const updatedGroups = permanentGroups.map((group) => ({
        ...group,
        items: group.items.filter((item) => !selected.has(item.bvid)),
      }));

      await StorageRepository.set({ permanentGroups: updatedGroups });
      clearSelection();
    } catch (error) {
      console.error('[PermanentGroups] Failed to batch delete:', error);
      alert('批量删除失败，请重试');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有永久分组吗？')) return;
    try {
      await StorageRepository.set({ permanentGroups: [] });
      clearSelection();
    } catch (error) {
      console.error('[PermanentGroups] Failed to clear groups:', error);
      alert('清空失败，请重试');
    }
  };

  const renderCard = (item: { bvid: string; title: string; uploader: string; coverUrl: string }) => {
    if (!item.bvid) return null;
    return (
      <ItemCard
        key={item.bvid}
        item={item}
        selected={selected.has(item.bvid)}
        onSelect={() => toggleSelection(item.bvid)}
        onDelete={() => handleDeleteItem(item.bvid)}
        small
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">永久分组 ({totalItems} 个视频)</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-green-400">学习: {learningItems.length}</span>
            <span className="text-blue-400">音乐: {musicItems.length}</span>
            <span className="text-yellow-400">娱乐: {entertainmentItems.length}</span>
          </div>
        </div>
        {totalItems > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            清空所有
          </button>
        )}
      </div>

      {totalItems === 0 ? (
        <p className="text-muted">没有永久分组视频</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Column */}
          <div className="bg-secondary p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📚</span>
              <h3 className="text-lg font-medium text-green-400">学习 ({learningItems.length})</h3>
            </div>
            <div className="grid gap-3">
              {learningItems.length === 0 ? (
                <p className="text-muted text-sm">暂无学习类视频</p>
              ) : (
                learningItems.map(renderCard)
              )}
            </div>
          </div>

          {/* Entertainment Column */}
          <div className="bg-secondary p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎮</span>
              <h3 className="text-lg font-medium text-yellow-400">娱乐 ({entertainmentItems.length})</h3>
            </div>
            <div className="grid gap-3">
              {entertainmentItems.length === 0 ? (
                <p className="text-muted text-sm">暂无娱乐类视频</p>
              ) : (
                entertainmentItems.map(renderCard)
              )}
            </div>
          </div>
        </div>
      )}

      <BatchToolbar
        selectedCount={selected.size}
        onSelectAll={selectAll}
        onDeleteSelected={handleBatchDelete}
        onClearSelection={clearSelection}
        totalCount={totalItems}
      />
    </div>
  );
}
