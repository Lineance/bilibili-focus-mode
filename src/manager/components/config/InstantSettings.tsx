import type { ExtensionConfig } from '@core/types';

interface InstantSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: any;
}

export function InstantSettings({ config, updateConfig, descriptions }: InstantSettingsProps) {
  return (
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
  );
}
