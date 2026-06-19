import type { ExtensionConfig, FieldDescription } from '@core/types';

interface DailyBypassSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function DailyBypassSettings({ config, updateConfig, descriptions }: DailyBypassSettingsProps): React.JSX.Element {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🎫 每日放行</h3>
      <p className="text-sm text-gray-400 mb-3">
        允许每天使用指定次数的放行功能，暂时跳过视频拦截
      </p>
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.dailyBypassEnabled}
            onChange={(e) => updateConfig('dailyBypassEnabled', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span>{descriptions.dailyBypassEnabled.label}</span>
        </label>

        {config.dailyBypassEnabled && (
          <div className="grid grid-cols-2 gap-4 ml-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.dailyBypassQuota.label}
              </label>
              <input
                type="number"
                value={config.dailyBypassQuota}
                onChange={(e) => updateConfig('dailyBypassQuota', parseInt(e.target.value))}
                min={descriptions.dailyBypassQuota.min}
                max={descriptions.dailyBypassQuota.max}
                step={descriptions.dailyBypassQuota.step}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.dailyBypassDurationMinutes.label}
              </label>
              <input
                type="number"
                value={config.dailyBypassDurationMinutes}
                onChange={(e) => updateConfig('dailyBypassDurationMinutes', parseInt(e.target.value))}
                min={descriptions.dailyBypassDurationMinutes.min}
                max={descriptions.dailyBypassDurationMinutes.max}
                step={descriptions.dailyBypassDurationMinutes.step}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
