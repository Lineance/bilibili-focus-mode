import type { ExtensionConfig, FieldDescription } from '@core/types';

interface DetectionSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function DetectionSettings({ config, updateConfig, descriptions }: DetectionSettingsProps): React.JSX.Element {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🔍 识别</h3>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.collectionDetectionEnabled}
          onChange={(e) => updateConfig('collectionDetectionEnabled', e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm">{descriptions.collectionDetectionEnabled.label}</span>
      </label>
    </div>
  );
}
