import type { ExtensionConfig } from '@core/types';

interface LiveEnhancementSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function LiveEnhancementSettings({ config, updateConfig }: LiveEnhancementSettingsProps): React.JSX.Element {
  const updateLiveEnhancement = (updates: Partial<ExtensionConfig['liveEnhancement']>) => {
    updateConfig('liveEnhancement', {
      ...config.liveEnhancement,
      ...updates,
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">📺 直播增强</h3>
      <p className="text-sm text-gray-400 mb-3">
        优化直播页面体验
      </p>
      
      <div className="space-y-3">
        {/* 总开关 */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.liveEnhancement.enabled}
            onChange={(e) => updateLiveEnhancement({ enabled: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>启用直播增强</span>
        </label>

        {config.liveEnhancement.enabled && (
          <div className="ml-6 space-y-3">
            {/* 隐藏播放器模糊 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.liveEnhancement.hidePlayerBlur}
                onChange={(e) => updateLiveEnhancement({ hidePlayerBlur: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">隐藏播放器模糊</span>
            </label>

            {/* 移除水印 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.liveEnhancement.removeWatermark}
                onChange={(e) => updateLiveEnhancement({ removeWatermark: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">移除水印</span>
            </label>

            {/* 移除遮罩面板 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.liveEnhancement.removeMaskPanel}
                onChange={(e) => updateLiveEnhancement({ removeMaskPanel: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">移除遮罩面板</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}