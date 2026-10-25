import type { ExtensionConfig } from '@core/types';
import { Icon } from '@ui';

import { TimeWindowFusePanel } from './TimeWindowFusePanel';

interface ReviewWindowBannerProps {
  config: ExtensionConfig;
  isInReviewWindow: boolean;
  onFuseApplied: () => void;
}

export function ReviewWindowBanner({ config, isInReviewWindow, onFuseApplied }: ReviewWindowBannerProps): React.JSX.Element {
  const active = !config.timeWindowEnabled || isInReviewWindow;
  const tone = active
    ? { color: 'var(--fm-success)', bg: 'color-mix(in srgb, var(--fm-success) 9%, transparent)', border: 'color-mix(in srgb, var(--fm-success) 32%, transparent)' }
    : { color: 'var(--fm-warning)', bg: 'color-mix(in srgb, var(--fm-warning) 9%, transparent)', border: 'color-mix(in srgb, var(--fm-warning) 32%, transparent)' };

  return (
    <div
      className="mb-6 rounded-[14px] border p-4"
      style={{ background: tone.bg, borderColor: tone.border }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span style={{ color: tone.color }}>
            <Icon name={active ? 'check' : 'clock'} size={18} />
          </span>
          <div>
            <p className="text-[13px] font-medium" style={{ color: tone.color }}>
              {!config.timeWindowEnabled
                ? '时间窗口已关闭，随时可审批'
                : isInReviewWindow
                  ? '当前处于审批时间'
                  : '当前不在审批时间'}
            </p>
            <p className="mt-0.5 text-[12px] text-tertiary">
              审批窗口 {config.windowStart} – {config.windowEnd}
            </p>
          </div>
        </div>

        {!active && (
          <p className="text-[12px] text-tertiary">
            需要现在处理？可生成一枚时间窗熔断码强制开启 1 小时。
          </p>
        )}
      </div>

      {!active && (
        <div className="mt-4 border-t border-secondary pt-4">
          <TimeWindowFusePanel onFuseApplied={onFuseApplied} />
        </div>
      )}
    </div>
  );
}
