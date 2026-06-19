import { useState } from 'react';

import type { ExtensionConfig, LimboItem } from '@core/types';
import { useLimboActions } from '@hooks/useLimboActions';
import { useSelection } from '@hooks/useSelection';

import { LimboReviewItem } from './LimboReviewItem';
import { ReviewWindowBanner } from './ReviewWindowBanner';
import { BatchToolbar } from './shared';

export function LimboReview({ items, config }: { items: readonly LimboItem[]; config: ExtensionConfig }) {
  const allBvids = items.map((item) => item.bvid);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const { processingBvid, handleAction, handleDelete, handleBatchDelete, handleClearAll } = useLimboActions(config);

  const now = new Date();
  const [windowStartHour, windowStartMinute] = config.windowStart.split(':').map(Number);
  const [windowEndHour, windowEndMinute] = config.windowEnd.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = windowStartHour * 60 + windowStartMinute;
  const endMinutes = windowEndHour * 60 + windowEndMinute;

  const calculateIsInReviewWindow = () => {
    if (!config.timeWindowEnabled) {
      return true;
    } else if (endMinutes >= startMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  };

  const [isInReviewWindow, setIsInReviewWindow] = useState(calculateIsInReviewWindow);

  const onDelete = async (bvid: string) => {
    const success = await handleDelete(bvid);
    if (success && isSelected(bvid)) {
      toggleSelection(bvid);
    }
  };

  const onBatchDelete = async () => {
    const success = await handleBatchDelete(selected);
    if (success) clearSelection();
  };

  const onClearAll = async () => {
    const success = await handleClearAll();
    if (success) clearSelection();
  };

  const onAction = async (item: LimboItem, action: 'permanent' | 'cooling' | 'instant') => {
    if (!isInReviewWindow) {
      alert('当前不在审批时间窗口，无法处理待审池视频\n请在 ' + config.windowStart + ' - ' + config.windowEnd + ' 期间进行审批');
      return;
    }
    const success = await handleAction(item, action);
    if (success && isSelected(item.bvid)) {
      toggleSelection(item.bvid);
    }
  };

  return (
    <div>
      <ReviewWindowBanner
        config={config}
        isInReviewWindow={isInReviewWindow}
        onFuseApplied={() => setIsInReviewWindow(true)}
      />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">待审池 ({items.length})</h2>
        {items.length > 0 && (
          <button
            onClick={onClearAll}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            清空待审池
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">待审池为空，在B站播放页添加视频</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <LimboReviewItem
              key={item.bvid}
              item={item}
              isSelected={isSelected(item.bvid)}
              isInReviewWindow={isInReviewWindow}
              isProcessing={processingBvid === item.bvid}
              onSelect={toggleSelection}
              onAction={onAction}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <BatchToolbar
        selectedCount={selected.size}
        onSelectAll={selectAll}
        onDeleteSelected={onBatchDelete}
        onClearSelection={clearSelection}
        totalCount={items.length}
      />
    </div>
  );
}
