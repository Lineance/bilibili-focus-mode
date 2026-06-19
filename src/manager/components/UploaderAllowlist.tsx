import React from 'react';
import { VideoTag, type AllowedUploader } from '@core/types';
import { useState } from 'react';

export function UploaderAllowlist({ uploaders }: { uploaders: AllowedUploader[] }): React.JSX.Element {
  const [newUploaderName, setNewUploaderName] = useState('');
  const [selectedTag, setSelectedTag] = useState<VideoTag>('LEARNING');

  const handleAdd = async () => {
    if (!newUploaderName.trim()) return;

    try {
      const storage = await chrome.storage.local.get();
      const currentUploaders = (storage.allowedUploaders || []) as AllowedUploader[];

      // Check if already exists
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

      await chrome.storage.local.set({
        allowedUploaders: [...currentUploaders, newUploader],
      });

      setNewUploaderName('');
      console.warn('[UploaderAllowlist] 添加成功！');
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to add uploader:', error);
      alert('添加失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要移除这个 UP 主吗？')) return;

    try {
      const storage = await chrome.storage.local.get();
      const currentUploaders = (storage.allowedUploaders || []) as AllowedUploader[];

      await chrome.storage.local.set({
        allowedUploaders: currentUploaders.filter((u) => u.id !== id),
      });
    } catch (error) {
      console.error('[UploaderAllowlist] Failed to delete uploader:', error);
      alert('删除失败，请重试');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有UP主吗？')) return;
    try {
      await chrome.storage.local.set({ allowedUploaders: [] });
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
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            清空所有
          </button>
        )}
      </div>

      {/* Add new uploader */}
      <div className="bg-gray-800 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-medium mb-3">添加UP主</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={newUploaderName}
            onChange={(e) => setNewUploaderName(e.target.value)}
            placeholder="输入UP主名称"
            className="flex-1 min-w-[200px] px-3 py-2 bg-gray-700 rounded"
          />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value as VideoTag)}
            className="px-3 py-2 bg-gray-700 rounded"
          >
            <option value="LEARNING">📚 学习</option>
            <option value="MUSIC">🎵 音乐</option>
            <option value="ENTERTAINMENT">🎮 娱乐</option>
          </select>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            添加
          </button>
        </div>
      </div>

      {/* Uploader list */}
      {uploaders.length === 0 ? (
        <p className="text-gray-500">暂无UP主白名单</p>
      ) : (
        <div className="grid gap-3">
          {uploaders.map((uploader) => (
            <div
              key={uploader.id}
              className="bg-gray-800 p-4 rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="font-medium">{uploader.name}</p>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${uploader.tag === 'LEARNING'
                      ? 'bg-green-600'
                      : 'bg-yellow-600'
                      }`}
                  >
                    {uploader.tag === 'LEARNING' ? '学习' : '娱乐'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(uploader.id)}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
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