import type { ExtensionConfig, FieldDescription } from '@core/types';

interface FuseSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function FuseSettings({ config, updateConfig, descriptions }: FuseSettingsProps): React.JSX.Element {
  return (
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
  );
}
