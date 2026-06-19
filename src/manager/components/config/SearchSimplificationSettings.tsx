import type { ExtensionConfig } from '@core/types';

interface SearchSimplificationSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function SearchSimplificationSettings({ config, updateConfig }: SearchSimplificationSettingsProps): React.JSX.Element {
  const updateSearchSimplification = (updates: Partial<ExtensionConfig['searchSimplification']>) => {
    updateConfig('searchSimplification', {
      ...config.searchSimplification,
      ...updates,
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🔍 搜索结果简化</h3>
      <p className="text-sm text-gray-400 mb-3">
        简化搜索结果页面，隐藏广告和推荐内容
      </p>
      
      <div className="space-y-3">
        {/* 总开关 */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.searchSimplification.enabled}
            onChange={(e) => updateSearchSimplification({ enabled: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>启用搜索结果简化</span>
        </label>

        {config.searchSimplification.enabled && (
          <div className="ml-6 space-y-3">
            {/* 隐藏广告 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.searchSimplification.hideAds}
                onChange={(e) => updateSearchSimplification({ hideAds: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏广告</span>
            </label>

            {/* 隐藏标题不含关键词的结果 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.searchSimplification.hideNonKeyword}
                onChange={(e) => updateSearchSimplification({ hideNonKeyword: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏标题不含关键词的结果</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              支持模糊匹配和拼音匹配（如输入"cs"匹配"测试"）
            </p>

            {/* 隐藏直播 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.searchSimplification.hideLiveStreams}
                onChange={(e) => updateSearchSimplification({ hideLiveStreams: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏直播结果</span>
            </label>

            {/* 紧凑布局 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.searchSimplification.compactLayout}
                onChange={(e) => updateSearchSimplification({ compactLayout: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">紧凑布局</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
