import type { ExtensionConfig } from '@core/types';

interface AppearanceEnhancementSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function AppearanceEnhancementSettings({ config, updateConfig }: AppearanceEnhancementSettingsProps): React.JSX.Element {
  const updateAppearanceEnhancement = (updates: Partial<ExtensionConfig['appearanceEnhancement']>) => {
    updateConfig('appearanceEnhancement', {
      ...config.appearanceEnhancement,
      ...updates,
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🎨 外观增强</h3>
      <p className="text-sm text-gray-400 mb-3">
        自定义页面外观，隐藏不需要的元素
      </p>
      
      <div className="space-y-3">
        {/* 总开关 */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.appearanceEnhancement.enabled}
            onChange={(e) => updateAppearanceEnhancement({ enabled: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>启用外观增强</span>
        </label>

        {config.appearanceEnhancement.enabled && (
          <div className="ml-6 space-y-3">
            {/* 细滚动条 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.elegantScrollbar}
                onChange={(e) => updateAppearanceEnhancement({ elegantScrollbar: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">细滚动条</span>
            </label>

            {/* 隐藏热搜搜索 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.hideTrendingSearch}
                onChange={(e) => updateAppearanceEnhancement({ hideTrendingSearch: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏热搜搜索</span>
            </label>

            {/* 隐藏用户卡片 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.hideUserCard}
                onChange={(e) => updateAppearanceEnhancement({ hideUserCard: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏用户卡片</span>
            </label>

            {/* 隐藏用户头像框 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.hideUserPendent}
                onChange={(e) => updateAppearanceEnhancement({ hideUserPendent: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏用户头像框</span>
            </label>

            {/* 隐藏视频笔记 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.hideVideoNotes}
                onChange={(e) => updateAppearanceEnhancement({ hideVideoNotes: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏视频笔记</span>
            </label>

            {/* 隐藏视频分享 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.hideVideoShare}
                onChange={(e) => updateAppearanceEnhancement({ hideVideoShare: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏视频分享</span>
            </label>

            {/* 隐藏视频投诉 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.hideVideoReport}
                onChange={(e) => updateAppearanceEnhancement({ hideVideoReport: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏视频投诉</span>
            </label>

            {/* 隐藏视频顶部遮罩 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.hideVideoTopMask}
                onChange={(e) => updateAppearanceEnhancement({ hideVideoTopMask: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏视频顶部遮罩</span>
            </label>

            {/* 隐藏相关视频 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.hideRelatedVideos}
                onChange={(e) => updateAppearanceEnhancement({ hideRelatedVideos: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏相关视频</span>
            </label>

            {/* 隐藏推荐直播 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.hideRecommendedLive}
                onChange={(e) => updateAppearanceEnhancement({ hideRecommendedLive: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏推荐直播</span>
            </label>

            {/* 禁用特殊弹幕 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.disableSpecialDanmaku}
                onChange={(e) => updateAppearanceEnhancement({ disableSpecialDanmaku: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">禁用特殊弹幕</span>
            </label>

            {/* 删除广告 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.appearanceEnhancement.removePromotions}
                onChange={(e) => updateAppearanceEnhancement({ removePromotions: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">删除广告</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}