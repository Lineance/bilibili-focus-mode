import React, { useState, useEffect } from 'react';

import type { ExtensionConfig, LimboItem, VideoTag } from '@core/types';
import { extractBvid } from '@core/utils/videoUrl';
import { useLimboActions } from '@hooks/useLimboActions';
import { useSelection } from '@hooks/useSelection';

import { LimboReviewItem } from './LimboReviewItem';
import { ReviewWindowBanner } from './ReviewWindowBanner';
import { BatchToolbar } from './shared';

export function LimboReview({ items, config }: { items: readonly LimboItem[]; config: ExtensionConfig }): React.JSX.Element {
  const allBvids = items.map((item) => item.bvid);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const { processingBvid, handleAction, handleDelete, handleBatchDelete, handleClearAll, handleAddByUrl } = useLimboActions(config);

  const [urlInput, setUrlInput] = useState('');
  const [urlTag, setUrlTag] = useState<VideoTag>('ENTERTAINMENT');
  const [isAdding, setIsAdding] = useState(false);

  const [windowStartHour, windowStartMinute] = config.windowStart.split(':').map(Number);
  const [windowEndHour, windowEndMinute] = config.windowEnd.split(':').map(Number);

  const [isInReviewWindow, setIsInReviewWindow] = useState(() => {
    if (!config.timeWindowEnabled) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = windowStartHour * 60 + windowStartMinute;
    const endMinutes = windowEndHour * 60 + windowEndMinute;
    if (endMinutes >= startMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  });

  useEffect(() => {
    const checkWindow = () => {
      if (!config.timeWindowEnabled) {
        setIsInReviewWindow(true);
        return;
      }
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = windowStartHour * 60 + windowStartMinute;
      const endMinutes = windowEndHour * 60 + windowEndMinute;

      let inWindow: boolean;
      if (endMinutes >= startMinutes) {
        inWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        inWindow = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }

      setIsInReviewWindow(inWindow);
    };

    checkWindow();
    const interval = setInterval(checkWindow, 60000);
    return () => clearInterval(interval);
  }, [windowStartHour, windowStartMinute, windowEndHour, windowEndMinute, config.timeWindowEnabled]);

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

  const onAddByUrl = async () => {
    const bvid = extractBvid(urlInput);
    if (!bvid) {
      alert('无法识别 BV 号，请检查输入\n支持格式：BV号 或 B站视频链接');
      return;
    }
    setIsAdding(true);
    try {
      const success = await handleAddByUrl(urlInput, urlTag);
      if (success) {
        setUrlInput('');
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div>
      <ReviewWindowBanner
        config={config}
        isInReviewWindow={isInReviewWindow}
        onFuseApplied={() => setIsInReviewWindow(true)}
      />

      <div className="bg-secondary rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">手动添加视频</h3>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddByUrl()}
            placeholder="粘贴 BV 号或 B站视频链接"
            className="flex-1 min-w-[240px] px-3 py-2 bg-primary border border-secondary rounded text-sm"
            disabled={isAdding}
          />
          <select
            value={urlTag}
            onChange={(e) => setUrlTag(e.target.value as VideoTag)}
            className="px-3 py-2 bg-primary border border-secondary rounded text-sm"
          >
            <option value="ENTERTAINMENT">娱乐</option>
            <option value="LEARNING">学习</option>
            <option value="MUSIC">音乐</option>
          </select>
          <button
            onClick={onAddByUrl}
            disabled={isAdding || !urlInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? '添加中...' : '添加'}
          </button>
        </div>
      </div>

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
        <p className="text-muted">待审池为空，在B站播放页添加视频</p>
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
