import React, { useEffect, useMemo, useState } from 'react';

import type { ExtensionConfig, InstantItem } from '@core/types';
import { useSelection } from '@hooks/useSelection';
import { useStorageActions } from '../hooks/useStorageActions';
import { Button, EmptyState, SectionHeader, StatusChip, confirmAction, toast } from '@ui';

import { BatchToolbar, VideoRow } from './shared';
import { FuseApplicationDialog } from './FuseApplicationDialog';

function formatRemaining(ms: number): string {
  if (ms <= 0) return '已过期';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `剩余 ${Math.max(1, minutes)} 分钟`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `剩余 ${hours} 小时`;
  return `剩余 ${Math.floor(hours / 24)} 天`;
}

export const InstantList = React.memo(function InstantList({ items, config }: { items: readonly InstantItem[]; config: ExtensionConfig }): React.JSX.Element {
  const allBvids = useMemo(() => items.map((item) => item.bvid), [items]);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);
  const { deleteFromList, batchDelete, clearList } = useStorageActions();
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const handleDelete = async (bvid: string) => {
    const ok = await confirmAction({
      title: '删除即时许可',
      description: '删除后该视频会重新进入拦截状态。',
      confirmLabel: '删除',
      danger: true,
    });
    if (!ok) return;

    const success = await deleteFromList('instantList', bvid);
    if (!success) {
      toast.error('删除失败，请重试');
      return;
    }
    if (isSelected(bvid)) toggleSelection(bvid);
    toast.success('已删除');
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirmAction({
      title: `删除 ${selected.size} 个即时许可`,
      description: '这些视频会重新进入拦截状态。',
      confirmLabel: '批量删除',
      danger: true,
    });
    if (!ok) return;

    const success = await batchDelete('instantList', selected);
    if (!success) {
      toast.error('批量删除失败，请重试');
      return;
    }
    clearSelection();
    toast.success('已批量删除');
  };

  const handleClearAll = async () => {
    const ok = await confirmAction({
      title: '清空即时许可',
      description: '所有即时许可都会被移除，且不可恢复。',
      confirmLabel: '清空',
      danger: true,
    });
    if (!ok) return;

    const success = await clearList('instantList');
    if (!success) {
      toast.error('清空失败，请重试');
      return;
    }
    clearSelection();
    toast.success('已清空');
  };

  return (
    <div>
      <SectionHeader
        title="即时许可"
        icon="bolt"
        count={items.length}
        description="带有效期的临时放行。到期后自动失效，重新回到拦截状态。"
        actions={
          <>
            <Button variant="primary" size="sm" icon="key" onClick={() => setShowApplyDialog(true)}>
              申请熔断码
            </Button>
            {items.length > 0 && (
              <Button variant="danger" size="sm" icon="trash" onClick={handleClearAll}>
                清空
              </Button>
            )}
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon="bolt"
          title="没有即时许可"
          description="在待审池审批视频时选择「立即」，即可生成带期限的即时许可。"
        />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const remaining = item.expiresAt - now;
            const expired = remaining <= 0;
            return (
              <VideoRow
                key={item.bvid}
                bvid={item.bvid}
                title={item.title}
                uploader={item.uploader}
                coverUrl={item.coverUrl}
                tag={item.tag}
                selected={isSelected(item.bvid)}
                onSelect={() => toggleSelection(item.bvid)}
                meta={
                  <StatusChip tone={expired ? 'error' : 'success'} icon="clock">
                    {formatRemaining(remaining)}
                  </StatusChip>
                }
                actions={
                  <Button variant="subtle" size="sm" icon="trash" onClick={() => handleDelete(item.bvid)}>
                    删除
                  </Button>
                }
              />
            );
          })}
        </div>
      )}

      {showApplyDialog && (
        <FuseApplicationDialog
          instantDurationHours={config.instantDurationHours}
          onApply={() => undefined}
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
