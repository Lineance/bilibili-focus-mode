import { useState } from 'react';

import type { PermanentGroup, VideoMetadata } from '@core/types';

import { BatchToolbar, VideoCover } from './shared';

export function PermanentGroups({ groups }: { groups: readonly PermanentGroup[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Flatten all items from all groups and separate by tag
  const allItems = groups.flatMap(group => group.items);
  const learningItems = allItems.filter(item => item.tag === 'LEARNING');
  const musicItems = allItems.filter(item => item.tag === 'MUSIC');
  const entertainmentItems = allItems.filter(item => item.tag === 'ENTERTAINMENT');
  const totalItems = allItems.length;

  const toggleSelection = (bvid: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(bvid)) {
      newSelected.delete(bvid);
    } else {
      newSelected.add(bvid);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(allItems.map((item) => item.bvid)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleDeleteItem = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;

    const storage = await chrome.storage.local.get();
    const permanentGroups = (storage.permanentGroups || []) as PermanentGroup[];

    // Remove item from whichever group it belongs to
    const updatedGroups = permanentGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.bvid !== bvid),
    }));

    await chrome.storage.local.set({ permanentGroups: updatedGroups });

    const newSelected = new Set(selected);
    newSelected.delete(bvid);
    setSelected(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;

    const storage = await chrome.storage.local.get();
    const permanentGroups = (storage.permanentGroups || []) as PermanentGroup[];

    const updatedGroups = permanentGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !selected.has(item.bvid)),
    }));

    await chrome.storage.local.set({ permanentGroups: updatedGroups });
    setSelected(new Set());
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有永久分组吗？')) return;
    await chrome.storage.local.set({ permanentGroups: [] });
    setSelected(new Set());
  };

  const renderItemCard = (item: VideoMetadata) => {
    // Skip items with undefined bvid
    if (!item.bvid) return null;
    const videoUrl = item.bvid.startsWith('LIVE_')
      ? `https://live.bilibili.com/${item.bvid.replace('LIVE_', '')}`
      : `https://www.bilibili.com/video/${item.bvid}`;

    return (
      <div
        key={item.bvid}
        className={`flex gap-3 items-center bg-gray-700 p-3 rounded ${selected.has(item.bvid) ? 'ring-2 ring-blue-500' : ''}`}
      >
        <input
          type="checkbox"
          checked={selected.has(item.bvid)}
          onChange={() => toggleSelection(item.bvid)}
          className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
        />
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <VideoCover url={item.coverUrl} title={item.title} small />
        </a>
        <div className="flex-1 min-w-0">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm truncate hover:text-blue-400 transition-colors block"
          >
            {item.title}
          </a>
          <p className="text-xs text-gray-400">{item.uploader}</p>
        </div>
        <button
          onClick={() => handleDeleteItem(item.bvid)}
          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 flex-shrink-0 transition-colors"
        >
          删除
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">永久分组 ({totalItems} 个视频)</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-green-400">学习: {learningItems.length}</span>
            <span className="text-blue-400">音乐: {musicItems.length}</span>
            <span className="text-yellow-400">娱乐: {entertainmentItems.length}</span>
          </div>
        </div>
        {totalItems > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            清空所有
          </button>
        )}
      </div>

      {totalItems === 0 ? (
        <p className="text-gray-500">没有永久分组视频</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Column */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📚</span>
              <h3 className="text-lg font-medium text-green-400">学习 ({learningItems.length})</h3>
            </div>
            <div className="grid gap-3">
              {learningItems.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无学习类视频</p>
              ) : (
                learningItems.map(renderItemCard)
              )}
            </div>
          </div>

          {/* Entertainment Column */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎮</span>
              <h3 className="text-lg font-medium text-yellow-400">娱乐 ({entertainmentItems.length})</h3>
            </div>
            <div className="grid gap-3">
              {entertainmentItems.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无娱乐类视频</p>
              ) : (
                entertainmentItems.map(renderItemCard)
              )}
            </div>
          </div>
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
