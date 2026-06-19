import type { ExtensionConfig } from '@core/types';

interface HomepageSectionProps {
  config: ExtensionConfig['homepageSimplification'];
  onUpdate: (updates: Partial<ExtensionConfig['homepageSimplification']>) => void;
}

export function HomepageSection({ config, onUpdate }: HomepageSectionProps): React.JSX.Element {
  return (
    <div className="border-t border-gray-700 pt-3 mt-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <span>启用首页样式简化</span>
      </label>

      {config.enabled && (
        <div className="ml-6 space-y-2 mt-2">
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
              checked={config.hideTrending}
              onChange={(e) => onUpdate({ hideTrending: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏热门榜单</span>
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
              checked={config.hideLiveStreams}
              onChange={(e) => onUpdate({ hideLiveStreams: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏直播</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.compactLayout}
              onChange={(e) => onUpdate({ compactLayout: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">紧凑布局</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.redirectToSearch}
              onChange={(e) => onUpdate({ redirectToSearch: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">重定向到搜索页（默认开启）</span>
          </label>
        </div>
      )}
    </div>
  );
}
