import React, { useEffect, useState } from 'react';

import type { ExtensionConfig, LimboItem, VideoTag } from '@core/types';
import { extractBvid } from '@core/utils/videoUrl';
import { useLimboActions } from '@hooks/useLimboActions';
import { useSelection } from '@hooks/useSelection';
import { Button, Dialog, EmptyState, SectionHeader, StatusChip, toast } from '@ui';

import { ReviewWindowBanner } from './ReviewWindowBanner';
import { BatchToolbar, VideoRow } from './shared';

const DURATION_OPTIONS = [
  { value: 1, label: '1 小时' },
  { value: 3, label: '3 小时' },
  { value: 6, label: '6 小时' },
  { value: 12, label: '12 小时' },
  { value: 24, label: '1 天' },
  { value: 72, label: '3 天' },
  { value: 168, label: '1 周' },
  { value: 720, label: '1 个月' },
  { value: 2160, label: '3 个月' },
];

function useReviewWindow(config: ExtensionConfig): boolean {
  const [isInReviewWindow, setIsInReviewWindow] = useState(() => {
    if (!config.timeWindowEnabled) return true;
    const [startHour, startMinute] = config.windowStart.split(':').map(Number);
    const [endHour, endMinute] = config.windowEnd.split(':').map(Number);
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return end >= start ? current >= start && current <= end : current >= start || current <= end;
  });

  useEffect(() => {
    const check = () => {
      if (!config.timeWindowEnabled) {
        setIsInReviewWindow(true);
        return;
      }
      const [startHour, startMinute] = config.windowStart.split(':').map(Number);
      const [endHour, endMinute] = config.windowEnd.split(':').map(Number);
      const now = new Date();
      const current = now.getHours() * 60 + now.getMinutes();
      const start = startHour * 60 + startMinute;
      const end = endHour * 60 + endMinute;
      setIsInReviewWindow(end >= start ? current >= start && current <= end : current >= start || current <= end);
    };

    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [config.timeWindowEnabled, config.windowStart, config.windowEnd]);

  return isInReviewWindow;
}

export function LimboReview({ items, config }: { items: readonly LimboItem[]; config: ExtensionConfig }): React.JSX.Element {
  const allBvids = items.map((item) => item.bvid);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const { processingBvid, handleAction, handleDelete, handleBatchDelete, handleClearAll, handleAddByUrl } = useLimboActions(config);

  const [urlInput, setUrlInput] = useState('');
  const [urlTag, setUrlTag] = useState<VideoTag>('ENTERTAINMENT');
  const [isAdding, setIsAdding] = useState(false);
  const [durationTarget, setDurationTarget] = useState<LimboItem | null>(null);

  const isInReviewWindow = useReviewWindow(config);

  const onDelete = async (bvid: string) => {
    const success = await handleDelete(bvid);
    if (success && isSelected(bvid)) toggleSelection(bvid);
  };

  const onBatchDelete = async () => {
    const success = await handleBatchDelete(selected);
    if (success) clearSelection();
  };

  const onClearAll = async () => {
    const success = await handleClearAll();
    if (success) clearSelection();
  };

  const onAction = async (item: LimboItem, action: 'permanent' | 'instant', durationHours?: number) => {
    if (!isInReviewWindow) {
      toast.error(`当前不在审批时间，请在 ${config.windowStart} - ${config.windowEnd} 期间处理`);
      return;
    }
    const success = await handleAction(item, action, durationHours);
    if (success && isSelected(item.bvid)) toggleSelection(item.bvid);
  };

  const onAddByUrl = async () => {
    const bvid = extractBvid(urlInput);
    if (!bvid) {
      toast.error('无法识别 BV 号，请检查输入');
      return;
    }
    setIsAdding(true);
    try {
      const success = await handleAddByUrl(urlInput, urlTag);
      if (success) setUrlInput('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div>
      <ReviewWindowBanner
        config={config}
        isInReviewWindow={isInReviewWindow}
        onFuseApplied={() => window.location.reload()}
      />

      <div className="fm-card mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-primary">手动添加视频</p>
            <p className="mt-0.5 text-[12px] text-tertiary">粘贴 BV 号或视频链接，先进入待审池再审批。</p>
          </div>
          <StatusChip tone="neutral" icon="list">
            {items.length} / {config.limboCapacity}
          </StatusChip>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddByUrl()}
            placeholder="BV1xx411c7mD 或 https://www.bilibili.com/video/..."
            className="min-w-[240px] flex-1"
            disabled={isAdding}
          />
          <select value={urlTag} onChange={(e) => setUrlTag(e.target.value as VideoTag)} aria-label="视频标签">
            <option value="ENTERTAINMENT">娱乐</option>
            <option value="LEARNING">学习</option>
            <option value="MUSIC">音乐</option>
          </select>
          <Button variant="primary" icon="plus" onClick={onAddByUrl} disabled={isAdding || !urlInput.trim()}>
            {isAdding ? '添加中…' : '添加'}
          </Button>
        </div>
      </div>

      <SectionHeader
        title="待审池"
        icon="list"
        count={items.length}
        description="审批通过后才会放行；超出容量的提交会被拒绝。"
        actions={
          items.length > 0 ? (
            <Button variant="danger" size="sm" icon="trash" onClick={onClearAll}>
              清空待审池
            </Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="list"
          title="待审池为空"
          description="在 B 站播放页点击「加入待审池」，视频会出现在这里等待审批。"
        />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <VideoRow
              key={item.bvid}
              bvid={item.bvid}
              title={item.title}
              uploader={item.uploader}
              coverUrl={item.coverUrl}
              tag={item.tag}
              selected={isSelected(item.bvid)}
              onSelect={() => toggleSelection(item.bvid)}
              meta={<span>加入于 {new Date(item.addedAt).toLocaleString('zh-CN', { hour12: false })}</span>}
              actions={
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    icon="folder"
                    disabled={!isInReviewWindow || processingBvid === item.bvid}
                    onClick={() => onAction(item, 'permanent')}
                    title={isInReviewWindow ? '加入永久分组' : '请在审批时间处理'}
                  >
                    永久
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="clock"
                    disabled={!isInReviewWindow || processingBvid === item.bvid}
                    onClick={() => setDurationTarget(item)}
                    title={isInReviewWindow ? '授予即时许可' : '请在审批时间处理'}
                  >
                    立即
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    icon="trash"
                    disabled={processingBvid === item.bvid}
                    onClick={() => onDelete(item.bvid)}
                  >
                    删除
                  </Button>
                </>
              }
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

      <Dialog
        open={durationTarget !== null}
        onClose={() => setDurationTarget(null)}
        title="选择即时许可时长"
        description="到期后视频会重新进入拦截状态。"
        maxWidth={440}
        footer={
          <Button variant="ghost" onClick={() => setDurationTarget(null)}>
            取消
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="rounded-lg border border-secondary bg-tertiary px-3 py-2 text-[12.5px] text-primary transition-colors hover:border-accent hover:text-accent"
              onClick={() => {
                const target = durationTarget;
                setDurationTarget(null);
                if (target) void onAction(target, 'instant', option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
