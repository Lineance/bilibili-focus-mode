import type { ExtensionConfig } from '@core/types';

import { TimeWindowFusePanel } from './TimeWindowFusePanel';

interface ReviewWindowBannerProps {
  config: ExtensionConfig;
  isInReviewWindow: boolean;
  onFuseApplied: () => void;
}

export function ReviewWindowBanner({ config, isInReviewWindow, onFuseApplied }: ReviewWindowBannerProps): React.JSX.Element {
  return (
    <div className={`mb-4 p-3 rounded-lg ${isInReviewWindow ? 'bg-green-900/50 border border-green-600' : 'bg-yellow-900/50 border border-yellow-600'}`}>
      <div className={`flex ${isInReviewWindow ? 'items-center justify-between' : 'flex-col gap-4'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{isInReviewWindow ? '✅' : '⏰'}</span>
          <span className={isInReviewWindow ? 'text-green-400 font-medium' : 'text-yellow-400 font-medium'}>
            {!config.timeWindowEnabled
              ? '时间窗口已关闭，随时可审批'
              : isInReviewWindow
                ? `当前是审批时间 (${config.windowStart} - ${config.windowEnd})`
                : `当前非审批时间 - 审批时间: ${config.windowStart} - ${config.windowEnd}`}
          </span>
        </div>
        {!config.timeWindowEnabled || isInReviewWindow ? null : (
          <div>
            <TimeWindowFusePanel onFuseApplied={onFuseApplied} />
          </div>
        )}
      </div>
    </div>
  );
}
