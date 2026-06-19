import type { ExtensionConfig } from '@core/types';

interface VideoPlayerSectionProps {
  config: ExtensionConfig['videoPlayerSimplification'];
  onUpdate: (updates: Partial<ExtensionConfig['videoPlayerSimplification']>) => void;
}

export function VideoPlayerSection({ config, onUpdate }: VideoPlayerSectionProps): React.JSX.Element {
  return (
    <>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <span>启用视频播放页样式简化</span>
      </label>

      {config.enabled && (
        <div className="ml-6 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.hideComments}
              onChange={(e) => onUpdate({ hideComments: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏评论区</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.hideRecommendations}
              onChange={(e) => onUpdate({ hideRecommendations: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏推荐视频</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.hideDanmaku}
              onChange={(e) => onUpdate({ hideDanmaku: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏弹幕</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.hideSidebar}
              onChange={(e) => onUpdate({ hideSidebar: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏侧边栏</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.hideAds}
              onChange={(e) => onUpdate({ hideAds: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏广告</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.minimalPlayer}
              onChange={(e) => onUpdate({ minimalPlayer: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">极简播放器模式（保留控制栏）</span>
          </label>
        </div>
      )}
    </>
  );
}
