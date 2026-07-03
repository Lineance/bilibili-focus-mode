import type { ExtensionConfig } from '@core/types';

interface ThemeEnhancementSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function ThemeEnhancementSettings({ config, updateConfig }: ThemeEnhancementSettingsProps): React.JSX.Element {
  const updateThemeEnhancement = (updates: Partial<ExtensionConfig['themeEnhancement']>) => {
    updateConfig('themeEnhancement', {
      ...config.themeEnhancement,
      ...updates,
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🌓 主题增强</h3>
      <p className="text-sm text-gray-400 mb-3">
        主题和封面相关增强功能
      </p>
      
      <div className="space-y-3">
        {/* 夜间模式跟随系统 */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.themeEnhancement.darkModeFollowSystem}
            onChange={(e) => updateThemeEnhancement({ darkModeFollowSystem: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>夜间模式跟随系统</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          自动跟随系统深色模式设置
        </p>

        {/* 替换封面 */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.themeEnhancement.replaceCover}
            onChange={(e) => updateThemeEnhancement({ replaceCover: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <span>替换标题党封面</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          用视频预览帧替换夸张的封面图片
        </p>
      </div>
    </div>
  );
}