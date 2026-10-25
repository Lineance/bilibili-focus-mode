import type { VideoMetadata } from '@core/types';
import { Icon } from '../../ui/Icon';
import './BlockOverlay.css';

export interface BlockOverlayProps {
  metadata: VideoMetadata;
  reason: string;
  windowInfo: { inReviewWindow: boolean; timeUntilWindow: number };
  fuseInfo: { allowFuse: boolean; isBankruptcy: boolean };
  bypassInfo: { enabled: boolean; remainingUses: number };
  onAddToPermanent: (metadata: VideoMetadata) => Promise<void>;
  onOpenManager: () => void;
  onDailyBypass: () => void;
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

function StatusBox({
  isBankruptcy,
  isOutsideWindow,
  timeText,
}: {
  isBankruptcy: boolean;
  isOutsideWindow: boolean;
  timeText: string;
}) {
  const boxClass = isBankruptcy
    ? 'bfm-status-box--bankruptcy'
    : isOutsideWindow
      ? 'bfm-status-box--outside-window'
      : 'bfm-status-box--in-window';

  const labelClass = isBankruptcy
    ? 'bfm-status-label--bankruptcy'
    : isOutsideWindow
      ? 'bfm-status-label--outside-window'
      : 'bfm-status-label--in-window';

  return (
    <div className={`bfm-status-box ${boxClass}`}>
      {isBankruptcy ? (
        <>
          <p className={`bfm-status-label ${labelClass}`}><Icon name="alert" size={14} /> 破产锁定中</p>
          <p className="bfm-status-text">
            破产期间禁止所有娱乐消费。虽然当前是审批时间，但你已陷入债务破产，请先前往管理页偿还债务。
          </p>
        </>
      ) : isOutsideWindow ? (
        <>
          <p className={`bfm-status-label ${labelClass}`}><Icon name="clock" size={14} /> 当前不在审批时间</p>
          <p className="bfm-status-text">距离下次审批时间：{timeText}</p>
          <span className="bfm-status-hint">审批时间才能处理待审池视频</span>
        </>
      ) : (
        <>
          <p className={`bfm-status-label ${labelClass}`}><Icon name="check" size={14} /> 当前是审批时间</p>
          <p className="bfm-status-text">
            你可以现在处理待审池视频。请先将此视频"加入待审池"，然后在管理页点击通过即可开始观看。
          </p>
        </>
      )}
    </div>
  );
}

export function BlockOverlay({
  metadata,
  reason,
  windowInfo,
  fuseInfo,
  bypassInfo,
  onAddToPermanent,
  onOpenManager,
  onDailyBypass,
}: BlockOverlayProps) {
  const isOutsideWindow = !windowInfo.inReviewWindow;
  const isBankruptcy = fuseInfo.isBankruptcy || reason === 'BANKRUPTCY';
  const effectiveBypass = isBankruptcy
    ? { enabled: false, remainingUses: bypassInfo.remainingUses }
    : bypassInfo;

  return (
    <div className="bilibili-focus-mode-block-overlay">
      <div className="bilibili-focus-mode-block-overlay-container">
        <p className="bfm-eyebrow">Focus Mode · 访问受限</p>
        <h2 className="bfm-title"><Icon name="lock" size={22} /> 视频未审批</h2>
        <p className="bfm-video-title">{metadata.title}</p>
        <p className="bfm-uploader">UP 主：{metadata.uploader}</p>

        <StatusBox
          isBankruptcy={isBankruptcy}
          isOutsideWindow={isOutsideWindow}
          timeText={formatTime(windowInfo.timeUntilWindow)}
        />

        <div className="bfm-buttons">
          <button
            id="bfm-daily-bypass"
            className={`bfm-btn bfm-btn--bypass ${!effectiveBypass.enabled || effectiveBypass.remainingUses <= 0 ? 'bfm-btn--disabled' : ''}`}
            disabled={!effectiveBypass.enabled || effectiveBypass.remainingUses <= 0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (effectiveBypass.enabled && effectiveBypass.remainingUses > 0) {
                onDailyBypass();
              }
            }}
          >
            <Icon name="shield" size={15} />
            {effectiveBypass.remainingUses > 0
              ? `每日放行 (${effectiveBypass.remainingUses} 次)`
              : '每日放行 (已用完)'}
          </button>
          {!isBankruptcy && (
            <button
              id="bfm-add-permanent"
              className="bfm-btn bfm-btn--submit"
              onClick={() => onAddToPermanent(metadata)}
            >
              <Icon name="list" size={15} />
              永久放行
            </button>
          )}
          <button
            id="bfm-open-manager"
            className="bfm-btn bfm-btn--manager"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
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
