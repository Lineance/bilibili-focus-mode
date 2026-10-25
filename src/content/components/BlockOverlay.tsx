import type { JSX } from 'react';
import type { VideoMetadata } from '@core/types';
import { Icon } from '../../ui/Icon';
import './BlockOverlay.css';

export interface BlockOverlayProps {
  metadata: VideoMetadata;
  reason: string;
  bypassInfo: { enabled: boolean; remainingUses: number };
  onAddToPermanent: (metadata: VideoMetadata) => Promise<void>;
  onOpenManager: () => void;
  onDailyBypass: () => void;
}

function StatusBox({ isBankruptcy }: { isBankruptcy: boolean }): JSX.Element {
  if (isBankruptcy) {
    return (
      <div className="bfm-status-box bfm-status-box--bankruptcy">
        <p className="bfm-status-label bfm-status-label--bankruptcy"><Icon name="alert" size={14} /> 破产锁定中</p>
        <p className="bfm-status-text">
          当前处于债务锁定期，娱乐内容暂时不可访问。请前往管理页查看债务状态。
        </p>
      </div>
    );
  }

  return (
    <div className="bfm-status-box bfm-status-box--outside-window">
      <p className="bfm-status-label bfm-status-label--outside-window"><Icon name="lock" size={14} /> 视频访问受限</p>
      <p className="bfm-status-text">选择永久放行，或使用今日剩余的全量放行次数。</p>
    </div>
  );
}

export function BlockOverlay({
  metadata,
  reason,
  bypassInfo,
  onAddToPermanent,
  onOpenManager,
  onDailyBypass,
}: BlockOverlayProps): JSX.Element {
  const isBankruptcy = reason === 'BANKRUPTCY';
  const effectiveBypass = isBankruptcy
    ? { enabled: false, remainingUses: bypassInfo.remainingUses }
    : bypassInfo;

  return (
    <div className="bilibili-focus-mode-block-overlay">
      <div className="bilibili-focus-mode-block-overlay-container">
        <p className="bfm-eyebrow">Focus Mode · 访问受限</p>
        <h2 className="bfm-title"><Icon name="lock" size={22} /> 视频已阻断</h2>
        <p className="bfm-video-title">{metadata.title}</p>
        <p className="bfm-uploader">UP 主：{metadata.uploader}</p>

        <StatusBox isBankruptcy={isBankruptcy} />

        <div className="bfm-buttons">
          <button
            id="bfm-daily-bypass"
            className={`bfm-btn bfm-btn--bypass ${!effectiveBypass.enabled || effectiveBypass.remainingUses <= 0 ? 'bfm-btn--disabled' : ''}`}
            disabled={!effectiveBypass.enabled || effectiveBypass.remainingUses <= 0}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (effectiveBypass.enabled && effectiveBypass.remainingUses > 0) onDailyBypass();
            }}
          >
            <Icon name="shield" size={15} />
            {effectiveBypass.remainingUses > 0
              ? `全量放行 (${effectiveBypass.remainingUses} 次)`
              : '全量放行 (已用完)'}
          </button>
          {!isBankruptcy && (
            <button
              id="bfm-add-permanent"
              className="bfm-btn bfm-btn--submit"
              onClick={() => onAddToPermanent(metadata)}
            >
              <Icon name="folder" size={15} />
              永久放行
            </button>
          )}
          <button
            id="bfm-open-manager"
            className="bfm-btn bfm-btn--manager"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpenManager();
            }}
          >
            <Icon name="external" size={15} />
            打开管理页
          </button>
        </div>
      </div>
    </div>
  );
}
