import type { ExtensionConfig, FieldDescription } from '@core/types';

interface CoolingSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function CoolingSettings({ config, updateConfig, descriptions }: CoolingSettingsProps): React.JSX.Element {
  return (
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
  );
}
