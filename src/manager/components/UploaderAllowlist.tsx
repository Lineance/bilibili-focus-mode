import React, { useState } from 'react';
import { type AllowedUploader, type VideoTag } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  SectionHeader,
  TagChip,
  confirmAction,
  toast,
} from '@ui';

const TAG_OPTIONS: { value: VideoTag; label: string }[] = [
  { value: 'LEARNING', label: '学习' },
  { value: 'MUSIC', label: '音乐' },
  { value: 'ENTERTAINMENT', label: '娱乐' },
];

export function UploaderAllowlist({ uploaders }: { uploaders: AllowedUploader[] }): React.JSX.Element {
  const [newUploaderName, setNewUploaderName] = useState('');
  const [selectedTag, setSelectedTag] = useState<VideoTag>('LEARNING');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const name = newUploaderName.trim();
    if (!name) return;

    try {
      const { allowedUploaders: currentUploaders } = await StorageRepository.getKeys('allowedUploaders');

      if (currentUploaders.some((uploader) => uploader.name === name)) {
        toast.error('该 UP 主已在白名单中');
        return;
      }

      const newUploader: AllowedUploader = {
        id: `uploader_${Date.now()}`,
        name,
        tag: selectedTag,
        addedAt: Date.now(),
      };

      await StorageRepository.set({ allowedUploaders: [...currentUploaders, newUploader] });
      setNewUploaderName('');
      toast.success(`已添加 ${name}`);
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to add uploader:', error);
      toast.error('添加失败，请重试');
    }
  };

  const handleDelete = async (uploader: AllowedUploader) => {
    const ok = await confirmAction({
      title: '移除 UP 主',
      description: `确定要将「${uploader.name}」移出白名单吗？其视频将重新需要审批。`,
      confirmLabel: '移除',
      danger: true,
    });
    if (!ok) return;

    try {
      await StorageRepository.update('allowedUploaders', (current) => current.filter((item) => item.id !== uploader.id));
      toast.success('已移除');
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to delete uploader:', error);
      toast.error('删除失败，请重试');
    }
  };

  const handleTagChange = async (id: string, newTag: VideoTag) => {
    try {
      await StorageRepository.update('allowedUploaders', (current) =>
        current.map((uploader) => (uploader.id === id ? { ...uploader, tag: newTag } : uploader))
      );
      setEditingId(null);
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to update tag:', error);
      toast.error('更新失败，请重试');
    }
  };

  const handleClearAll = async () => {
    const ok = await confirmAction({
      title: '清空 UP 主白名单',
      description: '所有白名单都会被移除。',
      confirmLabel: '清空',
      danger: true,
    });
    if (!ok) return;

    try {
      await StorageRepository.set({ allowedUploaders: [] });
      toast.success('已清空');
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to clear uploaders:', error);
      toast.error('清空失败，请重试');
    }
  };

  return (
    <div>
      <SectionHeader
        title="UP 主白名单"
        icon="user"
        count={uploaders.length}
        description="白名单 UP 主的视频会自动放行，并按标签计入债务/偿还。"
        actions={
          uploaders.length > 0 ? (
            <Button variant="danger" size="sm" icon="trash" onClick={handleClearAll}>
              清空所有
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-5">
        <p className="mb-3 text-[13px] font-medium">添加 UP 主</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newUploaderName}
            onChange={(e) => setNewUploaderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="输入 UP 主名称（需与 B 站显示名一致）"
            className="min-w-[220px] flex-1"
          />
          <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value as VideoTag)} aria-label="默认标签">
            {TAG_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button variant="primary" icon="plus" onClick={handleAdd} disabled={!newUploaderName.trim()}>
            添加
          </Button>
        </div>
      </Card>

      {uploaders.length === 0 ? (
        <EmptyState icon="user" title="暂无 UP 主白名单" description="把长期信任的 UP 主加入白名单，减少反复审批。" />
      ) : (
        <div className="grid gap-2.5">
          {uploaders.map((uploader) => (
            <div key={uploader.id} className="fm-row items-center">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-tertiary text-secondary">
                <Icon name="user" size={16} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{uploader.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  添加于 {new Date(uploader.addedAt).toLocaleDateString('zh-CN')}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {editingId === uploader.id ? (
                  <select
                    value={uploader.tag}
                    onChange={(e) => handleTagChange(uploader.id, e.target.value as VideoTag)}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    className="min-h-8 py-1 text-[12px]"
                    aria-label="标签"
                  >
                    {TAG_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button type="button" onClick={() => setEditingId(uploader.id)} title="点击修改标签">
                    <TagChip tag={uploader.tag} />
                  </button>
                )}

                <Button variant="subtle" size="sm" icon="trash" onClick={() => handleDelete(uploader)}>
                  移除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
