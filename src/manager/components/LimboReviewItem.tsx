import type { LimboItem } from '@core/types';
import { getVideoUrl } from '@core/utils/videoUrl';
import React from 'react';

import { VideoCover } from './shared';

interface LimboReviewItemProps {
  item: LimboItem;
  isSelected: boolean;
  isInReviewWindow: boolean;
  isProcessing: boolean;
  onSelect: (bvid: string) => void;
  onAction: (item: LimboItem, action: 'permanent' | 'cooling' | 'instant') => void;
  onDelete: (bvid: string) => void;
}

export const LimboReviewItem = React.memo(function LimboReviewItem({
  item,
  isSelected,
  isInReviewWindow,
  isProcessing,
  onSelect,
  onAction,
  onDelete,
}: LimboReviewItemProps): React.JSX.Element | null {
  if (!item.bvid) return null;

  const videoUrl = getVideoUrl(item.bvid);

  return (
    <div className={`bg-secondary p-4 rounded-lg ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex gap-4 items-start">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.bvid)}
          className="w-5 h-5 mt-2 rounded border-primary text-blue-600 focus:ring-blue-500"
        />
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <VideoCover url={item.coverUrl} title={item.title} />
        </a>
        <div className="flex-1">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium mb-1 hover:text-blue-400 transition-colors block"
          >
            {item.title}
          </a>
          <p className="text-sm text-secondary mb-2">{item.uploader}</p>
          <div className="flex gap-2 flex-wrap">
            <span className={`px-2 py-1 rounded text-xs ${item.tag === 'LEARNING' ? 'bg-success' : item.tag === 'MUSIC' ? 'bg-info' : 'bg-warning'}`}>
              {item.tag === 'LEARNING' ? '📚 学习' : item.tag === 'MUSIC' ? '🎵 音乐' : '🎮 娱乐'}
            </span>
            <button
              onClick={() => onAction(item, 'permanent')}
              disabled={!isInReviewWindow || isProcessing}
              className={`px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isInReviewWindow && !isProcessing
                ? 'bg-accent-primary hover:bg-accent-primary/90'
                : 'bg-tertiary cursor-not-allowed opacity-50'
                }`}
              title={isInReviewWindow ? '' : '请在审批时间处理'}
            >
              永久
            </button>
            <button
              onClick={() => onAction(item, 'cooling')}
              disabled={!isInReviewWindow || isProcessing}
              className={`px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isInReviewWindow && !isProcessing
                ? 'bg-accent-primary hover:bg-accent-primary/90'
                : 'bg-tertiary cursor-not-allowed opacity-50'
                }`}
              title={isInReviewWindow ? '' : '请在审批时间处理'}
            >
              冷静期
            </button>
            <button
              onClick={() => onAction(item, 'instant')}
              disabled={!isInReviewWindow || isProcessing}
              className={`px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isInReviewWindow && !isProcessing
                ? 'bg-warning hover:bg-warning/90'
                : 'bg-tertiary cursor-not-allowed opacity-50'
                }`}
              title={isInReviewWindow ? '' : '请在审批时间处理'}
            >
              立即
            </button>
            <button
              onClick={() => onDelete(item.bvid)}
              disabled={isProcessing}
              className="px-3 py-1 bg-error text-white rounded text-sm hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
