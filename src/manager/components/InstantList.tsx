import { useState } from 'react';
import { sendMessage } from 'webext-bridge/options';

import type { ExtensionConfig, InstantItem, VideoTag } from '@core/types';
import type { ProtocolMap } from '@core/protocol';

import { BatchToolbar, ItemCard } from './shared';

export function InstantList({ items, config }: { items: readonly InstantItem[]; config: ExtensionConfig }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [bvidInput, setBvidInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [uploaderInput, setUploaderInput] = useState('');
  const [tagInput, setTagInput] = useState<VideoTag>('ENTERTAINMENT');
  const [fuseCode, setFuseCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const now = Date.now();

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
    setSelected(new Set(items.map((item) => item.bvid)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;

    const storage = await chrome.storage.local.get();
    const instantList = (storage.instantList || []) as InstantItem[];
    const newInstantList = instantList.filter((item) => item.bvid !== bvid);
    await chrome.storage.local.set({ instantList: newInstantList });

    const newSelected = new Set(selected);
    newSelected.delete(bvid);
    setSelected(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;

    const storage = await chrome.storage.local.get();
    const instantList = (storage.instantList || []) as InstantItem[];
    const newInstantList = instantList.filter((item) => !selected.has(item.bvid));
    await chrome.storage.local.set({ instantList: newInstantList });
    setSelected(new Set());
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空即时许可列表吗？')) return;
    await chrome.storage.local.set({ instantList: [] });
    setSelected(new Set());
  };

  const handleApplyFuse = async () => {
    if (!bvidInput.trim() || !titleInput.trim() || !uploaderInput.trim()) {
      alert('请填写完整的视频信息');
      return;
    }

    setIsLoading(true);
    try {
      const response = await sendMessage('apply-fuse', {
        metadata: {
          bvid: bvidInput.trim(),
          title: titleInput.trim(),
          uploader: uploaderInput.trim(),
          coverUrl: '',
          tag: tagInput,
          addedAt: Date.now(),
        },
        isBankruptcy: false,
      } as ProtocolMap['apply-fuse']['req'], 'background') as any;

      if (response?.success && response.fuseCode) {
        setFuseCode(response.fuseCode);
        // Clear inputs
        setBvidInput('');
        setTitleInput('');
        setUploaderInput('');
      } else {
        alert(response?.message || '申请失败');
      }
    } catch (error) {
      console.error('Failed to apply for fuse:', error);
      alert('申请失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const closeDialog = () => {
    setShowApplyDialog(false);
    setFuseCode(null);
    setBvidInput('');
    setTitleInput('');
    setUploaderInput('');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">即时许可 ({items.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowApplyDialog(true)}
            className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
          >
            申请熔断码
          </button>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
            >
              清空列表
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">没有即时许可</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const isExpired = now >= item.expiresAt;
            const hoursLeft = Math.ceil((item.expiresAt - now) / 3600000);

            return (
              <ItemCard
                key={item.bvid}
                item={item}
                selected={selected.has(item.bvid)}
                onSelect={() => toggleSelection(item.bvid)}
                onDelete={() => handleDelete(item.bvid)}
              >
                <p className={`text-sm mt-2 ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                  {isExpired ? '已过期' : `剩余 ${hoursLeft} 小时`}
                </p>
              </ItemCard>
            );
          })}
        </div>
      )}

      {showApplyDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">申请即时许可熔断码</h3>

            {fuseCode ? (
              <div className="text-center">
                <p className="text-green-400 mb-2">熔断码申请成功！</p>
                <div className="bg-gray-900 p-4 rounded text-2xl font-mono text-yellow-400 mb-4">
                  {fuseCode}
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  有效期 {config.instantDurationHours} 小时，请牢记此码
                </p>
                <button
                  onClick={closeDialog}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                  关闭
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">BV号</label>
                    <input
                      type="text"
                      value={bvidInput}
                      onChange={(e) => setBvidInput(e.target.value)}
                      placeholder="如: BV1xx411c7mD"
                      className="w-full px-3 py-2 bg-gray-700 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">视频标题</label>
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      placeholder="输入视频标题"
                      className="w-full px-3 py-2 bg-gray-700 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">UP主</label>
                    <input
                      type="text"
                      value={uploaderInput}
                      onChange={(e) => setUploaderInput(e.target.value)}
                      placeholder="输入UP主名称"
                      className="w-full px-3 py-2 bg-gray-700 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">标签</label>
                    <select
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value as VideoTag)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
                    >
                      <option value="LEARNING">📚 学习</option>
                      <option value="MUSIC">🎵 音乐</option>
                      <option value="ENTERTAINMENT">🎮 娱乐</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeDialog}
                    className="flex-1 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleApplyFuse}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? '申请中...' : '申请熔断码'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
}
