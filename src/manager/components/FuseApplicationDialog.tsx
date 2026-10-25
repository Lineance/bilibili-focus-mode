import { useState } from 'react';
import { logger } from '@core/utils/logger';
import { sendMessage } from 'webext-bridge/options';
import type { VideoTag } from '@core/types';
import type { ProtocolMap } from '@core/protocol';
import { Button, Dialog, toast } from '@ui';

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
      toast.error('请填写完整的视频信息');
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
        toast.success('熔断码已生成');
      } else {
        toast.error(response?.message || '申请失败');
      }
    } catch (error) {
      logger.error('FuseApplicationDialog', 'Failed to apply for fuse:', error);
      toast.error('申请失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={fuseCode ? '熔断码已生成' : '申请即时许可熔断码'}
      description={fuseCode ? `有效期 ${instantDurationHours} 小时，需手动输入` : '为指定视频生成一次性熔断码。'}
      footer={
        fuseCode ? (
          <Button variant="primary" onClick={onClose}>关闭</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button variant="primary" icon="key" onClick={handleApplyFuse} disabled={isLoading}>
              {isLoading ? '申请中…' : '申请熔断码'}
            </Button>
          </>
        )
      }
    >
      {fuseCode ? (
        <div>
          <div className="rounded-xl border border-secondary bg-tertiary p-5 text-center">
            <p className="fm-label mb-3">请在播放页手动输入</p>
            <div
              className="select-none font-mono text-[22px] tracking-[0.28em] text-warning"
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {fuseCode}
            </div>
          </div>
          <p className="fm-hint mt-4">
            出于防止疲劳绕过的考虑，熔断码不支持复制粘贴；请逐字符输入。
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <div>
            <label className="fm-label mb-1.5 block" htmlFor="fuse-bvid">BV 号</label>
            <input
              id="fuse-bvid"
              type="text"
              value={bvidInput}
              onChange={(e) => setBvidInput(e.target.value)}
              placeholder="如：BV1xx411c7mD"
              className="w-full"
            />
          </div>
          <div>
            <label className="fm-label mb-1.5 block" htmlFor="fuse-title">视频标题</label>
            <input
              id="fuse-title"
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="输入视频标题"
              className="w-full"
            />
          </div>
          <div>
            <label className="fm-label mb-1.5 block" htmlFor="fuse-uploader">UP 主</label>
            <input
              id="fuse-uploader"
              type="text"
              value={uploaderInput}
              onChange={(e) => setUploaderInput(e.target.value)}
              placeholder="输入 UP 主名称"
              className="w-full"
            />
          </div>
          <div>
            <label className="fm-label mb-1.5 block" htmlFor="fuse-tag">标签</label>
            <select
              id="fuse-tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value as VideoTag)}
              className="w-full"
            >
              <option value="ENTERTAINMENT">娱乐</option>
              <option value="MUSIC">音乐</option>
              <option value="LEARNING">学习</option>
            </select>
          </div>
        </div>
      )}
    </Dialog>
  );
}
