import type { ExtensionConfig } from '@core/types';

interface FieldDescription {
  label: string;
  description: string;
}

interface DebtSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function DebtSettings({ config, updateConfig, descriptions }: DebtSettingsProps) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">💰 债务系统</h3>
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.debtEnabled}
            onChange={(e) => updateConfig('debtEnabled', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span>{descriptions.debtEnabled.label}</span>
        </label>

        {config.debtEnabled && (
          <div className="grid grid-cols-2 gap-4 ml-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.entertainmentRatio.label}
              </label>
              <input
                type="number"
                step="0.1"
                value={config.entertainmentRatio}
                onChange={(e) => updateConfig('entertainmentRatio', parseFloat(e.target.value))}
                min={0.5}
                max={5}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.learningRepayRatio.label}
              </label>
              <input
                type="number"
                step="0.1"
                value={config.learningRepayRatio}
                onChange={(e) => updateConfig('learningRepayRatio', parseFloat(e.target.value))}
                min={-5}
                max={-0.5}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.maxDebtMinutes.label}
              </label>
              <input
                type="number"
                value={config.maxDebtMinutes}
                onChange={(e) => updateConfig('maxDebtMinutes', parseInt(e.target.value))}
                min={10}
                max={300}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.bankruptcyLockHours.label}
              </label>
              <input
                type="number"
                value={config.bankruptcyLockHours}
                onChange={(e) => updateConfig('bankruptcyLockHours', parseInt(e.target.value))}
                min={1}
                max={168}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.postWatchCooldownMinutes.label}
              </label>
              <input
                type="number"
                value={config.postWatchCooldownMinutes}
                onChange={(e) => updateConfig('postWatchCooldownMinutes', parseInt(e.target.value))}
                min={0}
                max={120}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
