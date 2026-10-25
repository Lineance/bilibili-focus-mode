import React, { useMemo } from 'react';
import type { PermanentGroup } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';
import { useSelection } from '@hooks/useSelection';
import { Button, EmptyState, Icon, SectionHeader, confirmAction, toast } from '@ui';
import type { IconName } from '@ui';

import { BatchToolbar, VideoRow } from './shared';

const GROUP_ICON: Record<string, IconName> = {
  learning: 'book',
  entertainment: 'gamepad',
  music: 'music',
};

const GROUP_COLOR: Record<string, string> = {
  learning: 'var(--fm-success)',
  entertainment: 'var(--fm-warning)',
  music: 'var(--fm-info)',
};

export function PermanentGroups({ groups }: { groups: readonly PermanentGroup[] }): React.JSX.Element {
  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const allBvids = useMemo(() => allItems.map((item) => item.bvid), [allItems]);
  const { selected, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allBvids);

  const removeItems = async (bvids: Set<string>) => {
    const { permanentGroups } = await StorageRepository.getKeys('permanentGroups');
    const updated = permanentGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !bvids.has(item.bvid)),
    }));
    await StorageRepository.set({ permanentGroups: updated });
  };

  const handleDeleteItem = async (bvid: string) => {
    const ok = await confirmAction({
      title: '删除永久许可',
      description: '该视频会恢复拦截.',
      confirmLabel: '删除',
      danger: true,
    });
    if (!ok) return;

    try {
      await removeItems(new Set([bvid]));
      if (isSelected(bvid)) toggleSelection(bvid);
      toast.success('已删除');
    } catch (error) {
      console.error('[PermanentGroups] Failed to delete item:', error);
      toast.error('删除失败，请重试');
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirmAction({
      title: `删除 ${selected.size} 个永久许可`,
      description: '这些视频会恢复拦截.',
      confirmLabel: '批量删除',
      danger: true,
    });
    if (!ok) return;

    try {
      await removeItems(selected);
      clearSelection();
      toast.success('已批量删除');
    } catch (error) {
      console.error('[PermanentGroups] Failed to batch delete:', error);
      toast.error('批量删除失败，请重试');
    }
  };

  const handleClearAll = async () => {
    const ok = await confirmAction({
      title: '清空所有永久分组',
      description: '全部永久许可都会被移除，且不可恢复。',
      confirmLabel: '清空',
      danger: true,
    });
    if (!ok) return;

    try {
      await StorageRepository.set({ permanentGroups: [] });
      clearSelection();
      toast.success('已清空所有分组');
    } catch (error) {
      console.error('[PermanentGroups] Failed to clear groups:', error);
      toast.error('清空失败，请重试');
    }
  };

  const totalItems = allItems.length;

  return (
    <div>
      <SectionHeader
        title="永久分组"
        icon="folder"
        count={totalItems}
        description="长期放行的视频。分组按标签归档，删除后会恢复拦截。"
        actions={
          totalItems > 0 ? (
            <Button variant="danger" size="sm" icon="trash" onClick={handleClearAll}>
              清空所有
            </Button>
          ) : undefined
        }
      />

      {totalItems === 0 ? (
        <EmptyState
          icon="folder"
          title="没有永久分组"
          description="在阻断页选择 Tag 后即可加入永久放行。"
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((group) => {
            const tone = GROUP_COLOR[group.id] ?? 'var(--fm-accent-primary)';
            return (
              <div key={group.id} className="fm-card">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span style={{ color: tone }}>
                      <Icon name={GROUP_ICON[group.id] ?? 'folder'} size={17} />
                    </span>
                    <h3 className="text-[14px] font-semibold">{group.name}</h3>
                    <span className="rounded-full bg-tertiary px-2 py-0.5 font-mono text-[11px] text-tertiary">
                      {group.items.length}
                    </span>
                  </div>
                </div>

                {group.items.length === 0 ? (
                  <p className="fm-hint py-4 text-center">暂无视频</p>
                ) : (
                  <div className="grid gap-2.5">
                    {group.items.map((item) => (
                      <VideoRow
                        key={item.bvid}
                        bvid={item.bvid}
                        title={item.title}
                        uploader={item.uploader}
                        coverUrl={item.coverUrl}
                        selected={isSelected(item.bvid)}
                        onSelect={() => toggleSelection(item.bvid)}
                        actions={
                          <Button variant="subtle" size="sm" icon="trash" onClick={() => handleDeleteItem(item.bvid)}>
                            删除
                          </Button>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
