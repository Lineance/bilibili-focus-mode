import type { ExtensionConfig } from '@core/types';

interface DynamicSectionProps {
  config: ExtensionConfig['dynamicSimplification'];
  onUpdate: (updates: Partial<ExtensionConfig['dynamicSimplification']>) => void;
}

export function DynamicSection({ config, onUpdate }: DynamicSectionProps): React.JSX.Element {
  return (
    <div className="border-t border-gray-700 pt-3 mt-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <span>启用动态页样式简化</span>
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
            <span className="text-sm">隐藏推荐内容</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.hideLiveStreams}
              onChange={(e) => onUpdate({ hideLiveStreams: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">隐藏直播入口</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showOnlyFollowing}
              onChange={(e) => onUpdate({ showOnlyFollowing: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">仅显示关注内容</span>
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
              checked={config.compactLayout}
              onChange={(e) => onUpdate({ compactLayout: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">紧凑布局</span>
          </label>
        </div>
      )}
    </div>
  );
}
