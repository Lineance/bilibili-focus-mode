import type { ExtensionConfig, FieldDescription } from '@core/types';

interface LimboSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function LimboSettings({ config, updateConfig, descriptions }: LimboSettingsProps): React.JSX.Element {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🗃️ 待审池</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {descriptions.limboCapacity.label}
          </label>
          <input
            type="number"
            value={config.limboCapacity}
            onChange={(e) => updateConfig('limboCapacity', parseInt(e.target.value))}
            min={1}
            max={20}
            className="w-full px-3 py-2 bg-gray-700 rounded"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {descriptions.limboReviewTime.label}
          </label>
          <input
            type="time"
            value={config.limboReviewTime}
            onChange={(e) => updateConfig('limboReviewTime', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {descriptions.limboAutoPurgeHours.label}
          </label>
          <input
            type="number"
            value={config.limboAutoPurgeHours}
            onChange={(e) => updateConfig('limboAutoPurgeHours', parseInt(e.target.value))}
            min={0}
            max={168}
            className="w-full px-3 py-2 bg-gray-700 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">0 表示关闭自动清理</p>
        </div>
      </div>
    </div>
  );
}
