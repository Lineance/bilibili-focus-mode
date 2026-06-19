import type { ExtensionConfig, FieldDescription } from '@core/types';

interface TimeWindowSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function TimeWindowSettings({ config, updateConfig, descriptions }: TimeWindowSettingsProps): React.JSX.Element {
  return (
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
  );
}
