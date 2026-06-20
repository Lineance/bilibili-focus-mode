import React, { useState } from 'react';
import { VideoTag, type AllowedUploader } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';

const TAG_OPTIONS: { value: VideoTag; label: string; emoji: string }[] = [
  { value: 'LEARNING', label: '学习', emoji: '📚' },
  { value: 'MUSIC', label: '音乐', emoji: '🎵' },
  { value: 'ENTERTAINMENT', label: '娱乐', emoji: '🎮' },
];

const TAG_STYLES: Record<VideoTag, string> = {
  LEARNING: 'bg-success',
  MUSIC: 'bg-info',
  ENTERTAINMENT: 'bg-warning',
};

export function UploaderAllowlist({ uploaders }: { uploaders: AllowedUploader[] }): React.JSX.Element {
  const [newUploaderName, setNewUploaderName] = useState('');
  const [selectedTag, setSelectedTag] = useState<VideoTag>('LEARNING');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newUploaderName.trim()) return;

    try {
      const { allowedUploaders: currentUploaders } = await StorageRepository.getKeys('allowedUploaders');

      if (currentUploaders.some((u) => u.name === newUploaderName.trim())) {
        console.warn('[UploaderAllowlist] 该 UP 主已在白名单中');
        return;
      }

      const newUploader: AllowedUploader = {
        id: `uploader_${Date.now()}`,
        name: newUploaderName.trim(),
        tag: selectedTag,
        addedAt: Date.now(),
      };

      await StorageRepository.set({
        allowedUploaders: [...currentUploaders, newUploader],
      });

      setNewUploaderName('');
      console.info('[UploaderAllowlist] 添加成功！');
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to add uploader:', error);
      alert('添加失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要移除这个 UP 主吗？')) return;

    try {
      await StorageRepository.update('allowedUploaders', (current) =>
        current.filter((u) => u.id !== id)
      );
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to delete uploader:', error);
      alert('删除失败，请重试');
    }
  };

  const handleTagChange = async (id: string, newTag: VideoTag) => {
    try {
      await StorageRepository.update('allowedUploaders', (current) =>
        current.map((u) => u.id === id ? { ...u, tag: newTag } : u)
      );

      setEditingId(null);
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to update tag:', error);
      alert('更新失败，请重试');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有UP主吗？')) return;
    try {
      await StorageRepository.set({ allowedUploaders: [] });
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to clear uploaders:', error);
      alert('清空失败，请重试');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">UP主白名单</h2>
        {uploaders.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-error text-white rounded text-sm hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            清空所有
          </button>
        )}
      </div>

      {/* Add new uploader */}
      <div className="bg-secondary p-4 rounded-lg mb-4">
        <h3 className="text-lg font-medium mb-3">添加UP主</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={newUploaderName}
            onChange={(e) => setNewUploaderName(e.target.value)}
            placeholder="输入UP主名称"
            className="flex-1 min-w-[200px] px-3 py-2 bg-tertiary rounded"
          />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value as VideoTag)}
            className="px-3 py-2 bg-tertiary rounded"
          >
            {TAG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.emoji} {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-accent-primary rounded hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            添加
          </button>
        </div>
      </div>

      {/* Uploader list */}
      {uploaders.length === 0 ? (
        <p className="text-muted">暂无UP主白名单</p>
      ) : (
        <div className="grid gap-3">
          {uploaders.map((uploader) => (
            <div
              key={uploader.id}
              className="bg-secondary p-4 rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="font-medium">{uploader.name}</p>
                  {editingId === uploader.id ? (
                    <select
                      value={uploader.tag}
                      onChange={(e) => handleTagChange(uploader.id, e.target.value as VideoTag)}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                      className="px-2 py-1 bg-tertiary rounded border border-primary text-sm"
                    >
                      {TAG_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.emoji} {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingId(uploader.id)}
                      className={`px-2 py-0.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${TAG_STYLES[uploader.tag]}`}
                      title="点击修改标签"
                    >
                      {TAG_OPTIONS.find((opt) => opt.value === uploader.tag)?.emoji}{' '}
                      {TAG_OPTIONS.find((opt) => opt.value === uploader.tag)?.label}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(uploader.id)}
                className="px-3 py-1 bg-error text-white rounded text-sm hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
