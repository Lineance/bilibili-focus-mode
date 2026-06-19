import type { ExtensionConfig, FieldDescription } from '@core/types';

interface QuotaSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function QuotaSettings({ config, updateConfig, descriptions }: QuotaSettingsProps): React.JSX.Element {
  return (
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
  );
}
