import type { ExtensionConfig, FieldDescription } from '@core/types';

interface GhostSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function GhostSettings({ config, updateConfig, descriptions }: GhostSettingsProps): React.JSX.Element {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">👻 幽灵档案</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {descriptions.ghostLifespanDays.label}
          </label>
          <input
            type="number"
            value={config.ghostLifespanDays}
            onChange={(e) => updateConfig('ghostLifespanDays', parseInt(e.target.value))}
            min={1}
            max={30}
            className="w-full px-3 py-2 bg-gray-700 rounded"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {descriptions.ghostResurrectFuseLength.label}
          </label>
          <input
            type="number"
            value={config.ghostResurrectFuseLength}
            onChange={(e) => updateConfig('ghostResurrectFuseLength', parseInt(e.target.value))}
            min={4}
            max={128}
            className="w-full px-3 py-2 bg-gray-700 rounded"
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.ghostDoublePenalty}
              onChange={(e) => updateConfig('ghostDoublePenalty', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{descriptions.ghostDoublePenalty.label}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
