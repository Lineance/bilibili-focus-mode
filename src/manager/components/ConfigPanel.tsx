import { useEffect, useState } from 'react';

import { DEFAULT_CONFIG } from '@core/constants';
import { ConfigService } from '@core/services';
import type { ExtensionConfig } from '@core/types';

export function ConfigPanel() {
  const [config, setConfig] = useState<ExtensionConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const configService = new ConfigService();

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      const loaded = await configService.loadConfig();
      setConfig(loaded);
    };
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    const result = await configService.saveConfig(config);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert('保存失败: ' + result.errors?.map(e => e.message).join(', '));
    }
  };

  const handleReset = async () => {
    if (confirm('确定要重置为默认配置吗？')) {
      await configService.resetToDefaults();
      const defaultConfig = await configService.loadConfig();
      setConfig(defaultConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const descriptions = configService.getConfigDescriptions();

  const updateConfig = (field: keyof ExtensionConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">配置</h2>
        <div className="flex gap-2">
          {saved && (
            <span className="px-3 py-1 bg-green-600 rounded text-sm">
              ✓ 已保存
            </span>
          )}
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-gray-600 rounded text-sm hover:bg-gray-700"
          >
            重置默认
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
          >
            保存配置
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Time Window Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">⏰ 时间窗口</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.timeWindowEnabled}
                onChange={(e) => updateConfig('timeWindowEnabled', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>{descriptions.timeWindowEnabled.label}</span>
            </label>

            {config.timeWindowEnabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.windowStart.label}
                  </label>
                  <input
                    type="time"
                    value={config.windowStart}
                    onChange={(e) => updateConfig('windowStart', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.windowEnd.label}
                  </label>
                  <input
                    type="time"
                    value={config.windowEnd}
                    onChange={(e) => updateConfig('windowEnd', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Limbo Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">🗃️ 待审池</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.limboCapacity.label}
              </label>
              <input
                type="number"
                value={config.limboCapacity}
                onChange={(e) => updateConfig('limboCapacity', parseInt(e.target.value))}
                min={1}
                max={20}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.limboReviewTime.label}
              </label>
              <input
                type="time"
                value={config.limboReviewTime}
                onChange={(e) => updateConfig('limboReviewTime', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.limboAutoPurgeHours.label}
              </label>
              <input
                type="number"
                value={config.limboAutoPurgeHours}
                onChange={(e) => updateConfig('limboAutoPurgeHours', parseInt(e.target.value))}
                min={0}
                max={168}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">0 表示关闭自动清理</p>
            </div>
          </div>
        </div>

        {/* Instant Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">⚡ 即时许可</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.instantDurationHours.label}
              </label>
              <input
                type="number"
                value={config.instantDurationHours}
                onChange={(e) => updateConfig('instantDurationHours', parseInt(e.target.value))}
                min={1}
                max={24}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.instantBreakFuse}
                  onChange={(e) => updateConfig('instantBreakFuse', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{descriptions.instantBreakFuse.label}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Cooling Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">❄️ 冷静期</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.coolingCooldownHours.label}
              </label>
              <input
                type="number"
                value={config.coolingCooldownHours}
                onChange={(e) => updateConfig('coolingCooldownHours', parseInt(e.target.value))}
                min={1}
                max={168}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">{descriptions.coolingCooldownHours.description}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.coolingAvailableHours.label}
              </label>
              <input
                type="number"
                value={config.coolingAvailableHours}
                onChange={(e) => updateConfig('coolingAvailableHours', parseInt(e.target.value))}
                min={1}
                max={168}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">{descriptions.coolingAvailableHours.description}</p>
            </div>
          </div>
        </div>

        {/* Fuse Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">🔐 熔断码</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.baseFuseLength.label}
              </label>
              <input
                type="number"
                value={config.baseFuseLength}
                onChange={(e) => updateConfig('baseFuseLength', parseInt(e.target.value))}
                min={4}
                max={16}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.maxFuseLength.label}
              </label>
              <input
                type="number"
                value={config.maxFuseLength}
                onChange={(e) => updateConfig('maxFuseLength', parseInt(e.target.value))}
                min={config.baseFuseLength}
                max={128}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.bankruptcyOverrideMaxFuse.label}
              </label>
              <input
                type="number"
                value={config.bankruptcyOverrideMaxFuse}
                onChange={(e) => updateConfig('bankruptcyOverrideMaxFuse', parseInt(e.target.value))}
                min={config.baseFuseLength}
                max={128}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              checked={config.dynamicFuseEnabled}
              onChange={(e) => updateConfig('dynamicFuseEnabled', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{descriptions.dynamicFuseEnabled.label}</span>
          </label>
        </div>

        {/* Permanent Group Limits */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">📌 永久分组</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.maxGroups.label}
              </label>
              <input
                type="number"
                value={config.maxGroups}
                onChange={(e) => updateConfig('maxGroups', parseInt(e.target.value))}
                min={1}
                max={10}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.maxItemsPerGroup.label}
              </label>
              <input
                type="number"
                value={config.maxItemsPerGroup}
                onChange={(e) => updateConfig('maxItemsPerGroup', parseInt(e.target.value))}
                min={1}
                max={50}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.totalPermanentLimit.label}
              </label>
              <input
                type="number"
                value={config.totalPermanentLimit}
                onChange={(e) => updateConfig('totalPermanentLimit', parseInt(e.target.value))}
                min={1}
                max={200}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>
        </div>

        {/* Debt Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">💰 债务系统</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.debtEnabled}
                onChange={(e) => updateConfig('debtEnabled', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>{descriptions.debtEnabled.label}</span>
            </label>

            {config.debtEnabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.entertainmentRatio.label}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.entertainmentRatio}
                    onChange={(e) => updateConfig('entertainmentRatio', parseFloat(e.target.value))}
                    min={0.5}
                    max={5}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.learningRepayRatio.label}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.learningRepayRatio}
                    onChange={(e) => updateConfig('learningRepayRatio', parseFloat(e.target.value))}
                    min={-5}
                    max={-0.5}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.maxDebtMinutes.label}
                  </label>
                  <input
                    type="number"
                    value={config.maxDebtMinutes}
                    onChange={(e) => updateConfig('maxDebtMinutes', parseInt(e.target.value))}
                    min={10}
                    max={300}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.bankruptcyLockHours.label}
                  </label>
                  <input
                    type="number"
                    value={config.bankruptcyLockHours}
                    onChange={(e) => updateConfig('bankruptcyLockHours', parseInt(e.target.value))}
                    min={1}
                    max={168}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.postWatchCooldownMinutes.label}
                  </label>
                  <input
                    type="number"
                    value={config.postWatchCooldownMinutes}
                    onChange={(e) => updateConfig('postWatchCooldownMinutes', parseInt(e.target.value))}
                    min={0}
                    max={120}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ghost Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">👻 幽灵档案</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.ghostLifespanDays.label}
              </label>
              <input
                type="number"
                value={config.ghostLifespanDays}
                onChange={(e) => updateConfig('ghostLifespanDays', parseInt(e.target.value))}
                min={1}
                max={30}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.ghostResurrectFuseLength.label}
              </label>
              <input
                type="number"
                value={config.ghostResurrectFuseLength}
                onChange={(e) => updateConfig('ghostResurrectFuseLength', parseInt(e.target.value))}
                min={4}
                max={128}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.ghostDoublePenalty}
                  onChange={(e) => updateConfig('ghostDoublePenalty', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{descriptions.ghostDoublePenalty.label}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Quota Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">📊 配额</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.dailyCoolingQuota.label}
              </label>
              <input
                type="number"
                value={config.dailyCoolingQuota}
                onChange={(e) => updateConfig('dailyCoolingQuota', parseInt(e.target.value))}
                min={0}
                max={100}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.dailyInstantQuota.label}
              </label>
              <input
                type="number"
                value={config.dailyInstantQuota}
                onChange={(e) => updateConfig('dailyInstantQuota', parseInt(e.target.value))}
                min={0}
                max={100}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>
        </div>

        {/* Detection Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">🔍 识别</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.collectionDetectionEnabled}
              onChange={(e) => updateConfig('collectionDetectionEnabled', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{descriptions.collectionDetectionEnabled.label}</span>
          </label>
        </div>

        {/* Style Simplification Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">🎨 样式简化</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerSimplification.enabled}
                onChange={(e) => updateConfig('videoPlayerSimplification', {
                  ...config.videoPlayerSimplification,
                  enabled: e.target.checked
                })}
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
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideComments: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏评论区</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.hideRecommendations}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideRecommendations: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏推荐视频</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.hideDanmaku}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideDanmaku: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏弹幕</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.hideSidebar}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideSidebar: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏侧边栏</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.hideAds}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideAds: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏广告</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.minimalPlayer}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      minimalPlayer: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">极简播放器模式（保留控制栏）</span>
                </label>
              </div>
            )}

            <div className="border-t border-gray-700 pt-3 mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.homepageSimplification.enabled}
                  onChange={(e) => updateConfig('homepageSimplification', {
                    ...config.homepageSimplification,
                    enabled: e.target.checked
                  })}
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
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        hideRecommendations: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏推荐视频</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.hideTrending}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        hideTrending: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏热门榜单</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.hideAds}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        hideAds: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏广告</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.hideLiveStreams}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        hideLiveStreams: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏直播</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.compactLayout}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        compactLayout: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">紧凑布局</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.redirectToSearch}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        redirectToSearch: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">重定向到搜索页（默认开启）</span>
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 pt-3 mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.dynamicSimplification.enabled}
                  onChange={(e) => updateConfig('dynamicSimplification', {
                    ...config.dynamicSimplification,
                    enabled: e.target.checked
                  })}
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
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        hideRecommendations: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏推荐内容</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dynamicSimplification.hideLiveStreams}
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        hideLiveStreams: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏直播入口</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dynamicSimplification.showOnlyFollowing}
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        showOnlyFollowing: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">仅显示关注内容</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dynamicSimplification.hideAds}
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        hideAds: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏广告</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dynamicSimplification.compactLayout}
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        compactLayout: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">紧凑布局</span>
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 pt-3 mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.liveSimplification.enabled}
                  onChange={(e) => updateConfig('liveSimplification', {
                    ...config.liveSimplification,
                    enabled: e.target.checked
                  })}
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
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        hideComments: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏评论区</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.liveSimplification.hideGiftEffects}
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        hideGiftEffects: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏礼物特效</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.liveSimplification.hideAds}
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        hideAds: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏广告</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.liveSimplification.hideSidebar}
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        hideSidebar: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏侧边栏</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.liveSimplification.minimalPlayer}
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        minimalPlayer: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">极简播放器模式</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
