import type { ExtensionConfig } from '@core/types';

interface StyleSimplificationSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function StyleSimplificationSettings({ config, updateConfig }: StyleSimplificationSettingsProps) {
  const updateVideoPlayerSimplification = (updates: Partial<typeof config.videoPlayerSimplification>) => {
    updateConfig('videoPlayerSimplification', {
      ...config.videoPlayerSimplification,
      ...updates
    });
  };

  const updateHomepageSimplification = (updates: Partial<typeof config.homepageSimplification>) => {
    updateConfig('homepageSimplification', {
      ...config.homepageSimplification,
      ...updates
    });
  };

  const updateDynamicSimplification = (updates: Partial<typeof config.dynamicSimplification>) => {
    updateConfig('dynamicSimplification', {
      ...config.dynamicSimplification,
      ...updates
    });
  };

  const updateLiveSimplification = (updates: Partial<typeof config.liveSimplification>) => {
    updateConfig('liveSimplification', {
      ...config.liveSimplification,
      ...updates
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🎨 样式简化</h3>
      <div className="space-y-3">
        {/* Video Player Simplification */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.videoPlayerSimplification.enabled}
            onChange={(e) => updateVideoPlayerSimplification({ enabled: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>启用视频播放页样式简化</span>
        </label>

        {config.videoPlayerSimplification.enabled && (
          <div className="ml-6 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerSimplification.hideComments}
                onChange={(e) => updateVideoPlayerSimplification({ hideComments: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏评论区</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerSimplification.hideRecommendations}
                onChange={(e) => updateVideoPlayerSimplification({ hideRecommendations: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏推荐视频</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerSimplification.hideDanmaku}
                onChange={(e) => updateVideoPlayerSimplification({ hideDanmaku: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏弹幕</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerSimplification.hideSidebar}
                onChange={(e) => updateVideoPlayerSimplification({ hideSidebar: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏侧边栏</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerSimplification.hideAds}
                onChange={(e) => updateVideoPlayerSimplification({ hideAds: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏广告</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerSimplification.minimalPlayer}
                onChange={(e) => updateVideoPlayerSimplification({ minimalPlayer: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">极简播放器模式（保留控制栏）</span>
            </label>
          </div>
        )}

        {/* Homepage Simplification */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.homepageSimplification.enabled}
              onChange={(e) => updateHomepageSimplification({ enabled: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span>启用首页样式简化</span>
          </label>

          {config.homepageSimplification.enabled && (
            <div className="ml-6 space-y-2 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.homepageSimplification.hideRecommendations}
                  onChange={(e) => updateHomepageSimplification({ hideRecommendations: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏推荐视频</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.homepageSimplification.hideTrending}
                  onChange={(e) => updateHomepageSimplification({ hideTrending: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏热门榜单</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.homepageSimplification.hideAds}
                  onChange={(e) => updateHomepageSimplification({ hideAds: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏广告</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.homepageSimplification.hideLiveStreams}
                  onChange={(e) => updateHomepageSimplification({ hideLiveStreams: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏直播</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.homepageSimplification.compactLayout}
                  onChange={(e) => updateHomepageSimplification({ compactLayout: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">紧凑布局</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.homepageSimplification.redirectToSearch}
                  onChange={(e) => updateHomepageSimplification({ redirectToSearch: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">重定向到搜索页（默认开启）</span>
              </label>
            </div>
          )}
        </div>

        {/* Dynamic Page Simplification */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.dynamicSimplification.enabled}
              onChange={(e) => updateDynamicSimplification({ enabled: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span>启用动态页样式简化</span>
          </label>

          {config.dynamicSimplification.enabled && (
            <div className="ml-6 space-y-2 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.dynamicSimplification.hideRecommendations}
                  onChange={(e) => updateDynamicSimplification({ hideRecommendations: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏推荐内容</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.dynamicSimplification.hideLiveStreams}
                  onChange={(e) => updateDynamicSimplification({ hideLiveStreams: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏直播入口</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.dynamicSimplification.showOnlyFollowing}
                  onChange={(e) => updateDynamicSimplification({ showOnlyFollowing: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">仅显示关注内容</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.dynamicSimplification.hideAds}
                  onChange={(e) => updateDynamicSimplification({ hideAds: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏广告</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.dynamicSimplification.compactLayout}
                  onChange={(e) => updateDynamicSimplification({ compactLayout: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">紧凑布局</span>
              </label>
            </div>
          )}
        </div>

        {/* Live Page Simplification */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.liveSimplification.enabled}
              onChange={(e) => updateLiveSimplification({ enabled: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span>启用直播页样式简化</span>
          </label>

          {config.liveSimplification.enabled && (
            <div className="ml-6 space-y-2 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.liveSimplification.hideComments}
                  onChange={(e) => updateLiveSimplification({ hideComments: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏评论区</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.liveSimplification.hideGiftEffects}
                  onChange={(e) => updateLiveSimplification({ hideGiftEffects: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏礼物特效</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.liveSimplification.hideAds}
                  onChange={(e) => updateLiveSimplification({ hideAds: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏广告</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.liveSimplification.hideSidebar}
                  onChange={(e) => updateLiveSimplification({ hideSidebar: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">隐藏侧边栏</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.liveSimplification.minimalPlayer}
                  onChange={(e) => updateLiveSimplification({ minimalPlayer: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">极简播放器模式</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
