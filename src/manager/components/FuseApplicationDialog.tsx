import { useState } from 'react';
import { logger } from '@core/utils/logger';
import { sendMessage } from 'webext-bridge/options';

import type { VideoTag } from '@core/types';
import type { ProtocolMap } from '@core/protocol';

interface FuseApplicationDialogProps {
  instantDurationHours: number;
  onApply: (bvid: string, fuseCode: string) => void;
  onClose: () => void;
}

export function FuseApplicationDialog({ instantDurationHours, onApply, onClose }: FuseApplicationDialogProps) {
  const [bvidInput, setBvidInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [uploaderInput, setUploaderInput] = useState('');
  const [tagInput, setTagInput] = useState<VideoTag>('ENTERTAINMENT');
  const [fuseCode, setFuseCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      } as ProtocolMap['apply-fuse']['req'], 'background') as ProtocolMap['apply-fuse']['res'];

      if (response?.success && response.fuseCode) {
        setFuseCode(response.fuseCode);
        onApply(bvidInput.trim(), response.fuseCode);
        setBvidInput('');
        setTitleInput('');
        setUploaderInput('');
      } else {
        alert(response?.message || '申请失败');
      }
    } catch (error) {
      logger.error('FuseApplicationDialog', 'Failed to apply for fuse:', error);
      alert('申请失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              有效期 {instantDurationHours} 小时，请牢记此码
            </p>
            <button
              onClick={onClose}
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
                onClick={onClose}
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
  );
}
