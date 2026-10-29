import { SettingsSection } from '@ui';
import type { ExtensionConfig, FieldDescription } from '@core/types';

interface DetectionSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function DetectionSettings({ config, updateConfig, descriptions }: DetectionSettingsProps): React.JSX.Element {
  return (
    <SettingsSection icon="search" title="识别">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.collectionDetectionEnabled}
          onChange={(e) => updateConfig('collectionDetectionEnabled', e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm">{descriptions.collectionDetectionEnabled.label}</span>
      </label>
    </SettingsSection>
  );
}
