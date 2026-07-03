import type { LimboItem } from '@core/types';
import { getVideoUrl } from '@core/utils/videoUrl';
import React, { useState } from 'react';

import { VideoCover } from './shared';

interface LimboReviewItemProps {
  item: LimboItem;
  isSelected: boolean;
  isInReviewWindow: boolean;
  isProcessing: boolean;
  onSelect: (bvid: string) => void;
  onAction: (item: LimboItem, action: 'permanent' | 'instant', durationHours?: number) => void;
  onDelete: (bvid: string) => void;
}

const DURATION_OPTIONS = [
  { value: 1, label: '1小时' },
  { value: 3, label: '3小时' },
  { value: 6, label: '6小时' },
  { value: 12, label: '12小时' },
  { value: 24, label: '1天' },
  { value: 72, label: '3天' },
  { value: 168, label: '1周' },
  { value: 720, label: '1个月' },
  { value: 2160, label: '3个月' },
];

export const LimboReviewItem = React.memo(function LimboReviewItem({
  item,
  isSelected,
  isInReviewWindow,
  isProcessing,
  onSelect,
  onAction,
  onDelete,
}: LimboReviewItemProps): React.JSX.Element | null {
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  
  if (!item.bvid) return null;

  const videoUrl = getVideoUrl(item.bvid);

  const handleInstantClick = () => {
    setShowDurationPicker(true);
  };

  const handleDurationSelect = (hours: number) => {
    setShowDurationPicker(false);
    onAction(item, 'instant', hours);
  };

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
          <div className="flex gap-2 flex-wrap items-center">
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
            <div className="relative">
              <button
                onClick={handleInstantClick}
                disabled={!isInReviewWindow || isProcessing}
                className={`px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isInReviewWindow && !isProcessing
                  ? 'bg-warning hover:bg-warning/90'
                  : 'bg-tertiary cursor-not-allowed opacity-50'
                  }`}
                title={isInReviewWindow ? '' : '请在审批时间处理'}
              >
                立即
              </button>
              {showDurationPicker && (
                <div className="absolute top-full left-0 mt-1 bg-primary border border-secondary rounded-lg shadow-lg z-10 p-2 min-w-[100px]">
                  <p className="text-xs text-muted mb-2 px-2">选择有效期</p>
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleDurationSelect(option.value)}
                      className="w-full text-left px-2 py-1 text-sm rounded hover:bg-hover transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
