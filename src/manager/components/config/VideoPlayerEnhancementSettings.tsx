import type { ExtensionConfig } from '@core/types';

interface VideoPlayerEnhancementSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function VideoPlayerEnhancementSettings({ config, updateConfig }: VideoPlayerEnhancementSettingsProps): React.JSX.Element {
  const updateVideoPlayerEnhancement = (updates: Partial<ExtensionConfig['videoPlayerEnhancement']>) => {
    updateConfig('videoPlayerEnhancement', {
      ...config.videoPlayerEnhancement,
      ...updates,
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🎬 播放器增强</h3>
      <p className="text-sm text-gray-400 mb-3">
        增强视频播放器功能
      </p>
      
      <div className="space-y-3">
        {/* 总开关 */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.videoPlayerEnhancement.enabled}
            onChange={(e) => updateVideoPlayerEnhancement({ enabled: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>启用播放器增强</span>
        </label>

        {config.videoPlayerEnhancement.enabled && (
          <div className="ml-6 space-y-3">
            {/* 扩展倍速 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerEnhancement.extendSpeed}
                onChange={(e) => updateVideoPlayerEnhancement({ extendSpeed: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">扩展倍速 (0.0625x-16x)</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              支持更精细的播放速度控制
            </p>

            {/* 记忆倍速 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerEnhancement.rememberSpeed}
                onChange={(e) => updateVideoPlayerEnhancement({ rememberSpeed: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">记忆倍速</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              自动记住上次使用的播放速度
            </p>
          </div>
        )}
      </div>
    </div>
  );
}