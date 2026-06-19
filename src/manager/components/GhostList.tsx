import { useState, useEffect } from 'react';

import { GhostResurrectionService } from '@core/services';
import type { ExtensionConfig, GhostItem } from '@core/types';
import { useSelection } from '@hooks/useSelection';

import { BatchToolbar, ItemCard } from './shared';

export function GhostList({ items, config }: { items: readonly GhostItem[]; config: ExtensionConfig }) {
  const allBvids = items.map((item) => item.bvid);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要彻底删除这个视频吗？（无法恢复）')) return;

    const storage = await chrome.storage.local.get();
    const ghostList = (storage.ghostList || []) as GhostItem[];
    const newGhostList = ghostList.filter((item) => item.bvid !== bvid);
    await chrome.storage.local.set({ ghostList: newGhostList });

    if (isSelected(bvid)) {
      toggleSelection(bvid);
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要彻底删除选中的 ${selected.size} 个视频吗？（无法恢复）`)) return;

    const storage = await chrome.storage.local.get();
    const ghostList = (storage.ghostList || []) as GhostItem[];
    const newGhostList = ghostList.filter((item) => !selected.has(item.bvid));
    await chrome.storage.local.set({ ghostList: newGhostList });
    clearSelection();
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空幽灵档案吗？（无法恢复）')) return;
    await chrome.storage.local.set({ ghostList: [] });
    clearSelection();
  };

  const handleResurrect = async (item: GhostItem) => {
    const repentanceReason = prompt('请输入忏悔理由（至少 10 字）');
    if (!repentanceReason) return;

    const fuseCodeInput = prompt('请输入招魂熔断码');
    if (!fuseCodeInput) return;

    const service = new GhostResurrectionService(config);
    const result = await service.resurrect(item, fuseCodeInput, repentanceReason);
    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">幽灵档案 ({items.length})</h2>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            清空档案
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">没有幽灵档案</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const daysLeft = Math.ceil((item.canResurrectUntil - now) / (24 * 3600000));

            return (
              <ItemCard
                key={item.bvid}
                item={item}
                selected={selected.has(item.bvid)}
                onSelect={() => toggleSelection(item.bvid)}
                onDelete={() => handleDelete(item.bvid)}
              >
                <p className="text-sm mt-2 text-gray-400">
                  {daysLeft > 0 ? `还可招魂 ${daysLeft} 天` : '已彻底消失'}
                </p>
                {daysLeft > 0 && (
                  <button
                    onClick={() => handleResurrect(item)}
                    className="mt-2 px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700"
                  >
                    招魂
                  </button>
                )}
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
}
