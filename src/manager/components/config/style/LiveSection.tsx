import type { ExtensionConfig } from '@core/types';

interface LiveSectionProps {
  config: ExtensionConfig['liveSimplification'];
  onUpdate: (updates: Partial<ExtensionConfig['liveSimplification']>) => void;
}

export function LiveSection({ config, onUpdate }: LiveSectionProps): React.JSX.Element {
  return (
    <div className="border-t border-gray-700 pt-3 mt-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <span>启用直播页样式简化</span>
      </label>

      {config.enabled && (
        <div className="ml-6 space-y-2 mt-2">
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
              checked={config.hideGiftEffects}
              onChange={(e) => onUpdate({ hideGiftEffects: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏礼物特效</span>
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
              checked={config.hideSidebar}
              onChange={(e) => onUpdate({ hideSidebar: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏侧边栏</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.minimalPlayer}
              onChange={(e) => onUpdate({ minimalPlayer: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">极简播放器模式</span>
          </label>
        </div>
      )}
    </div>
  );
}
