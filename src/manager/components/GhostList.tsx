import React from 'react';

import { GhostResurrectionService } from '@core/services';
import type { ExtensionConfig, GhostItem } from '@core/types';
import { useNow } from '@hooks/useNow';
import { useSelection } from '@hooks/useSelection';
import { useStorageActions } from '../hooks/useStorageActions';

import { BatchToolbar, ItemCard } from './shared';

export const GhostList = React.memo(function GhostList({ items, config }: { items: readonly GhostItem[]; config: ExtensionConfig }): React.JSX.Element {
  const allBvids = items.map((item) => item.bvid);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const { deleteFromList, batchDelete, clearList } = useStorageActions();
  const now = useNow(60000);

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要彻底删除这个视频吗？（无法恢复）')) return;
    const success = await deleteFromList('ghostList', bvid);
    if (!success) { alert('删除失败，请重试'); return; }
    if (isSelected(bvid)) toggleSelection(bvid);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要彻底删除选中的 ${selected.size} 个视频吗？（无法恢复）`)) return;
    const success = await batchDelete('ghostList', selected);
    if (!success) alert('批量删除失败，请重试');
    else clearSelection();
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空幽灵档案吗？（无法恢复）')) return;
    const success = await clearList('ghostList');
    if (!success) alert('清空失败，请重试');
    else clearSelection();
  };

  const handleResurrect = async (item: GhostItem) => {
    const repentanceReason = prompt('请输入忏悔理由（至少 10 字）');
    if (!repentanceReason) return;

    const fuseCodeInput = prompt('请输入招魂熔断码');
    if (!fuseCodeInput) return;

    const service = new GhostResurrectionService(config);
    const result = await service.resurrect(item, fuseCodeInput, repentanceReason);
    if (!result.ok) {
      alert(result.error.message);
      return;
    }

    alert(`招魂成功！视频已进入冷静期${config.ghostDoublePenalty ? '（双倍冷静期惩罚）' : ''}`);
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
        <p className="text-muted">没有幽灵档案</p>
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
                <p className="text-sm mt-2 text-secondary">
                  {daysLeft > 0 ? `还可招魂 ${daysLeft} 天` : '已彻底消失'}
                </p>
                {daysLeft > 0 && (
                  <button
                    onClick={() => handleResurrect(item)}
                    className="mt-2 px-3 py-1 bg-accent-primary rounded text-sm hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
});
