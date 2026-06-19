import type { ExtensionConfig, FieldDescription } from '@core/types';

interface PermanentGroupSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function PermanentGroupSettings({ config, updateConfig, descriptions }: PermanentGroupSettingsProps): React.JSX.Element {
  return (
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
  );
}
