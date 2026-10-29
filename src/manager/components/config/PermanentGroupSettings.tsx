import { SettingsSection } from '@ui';
import type { ExtensionConfig, FieldDescription } from '@core/types';

interface PermanentGroupSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
  descriptions: Record<string, FieldDescription>;
}

export function PermanentGroupSettings({ config, updateConfig, descriptions }: PermanentGroupSettingsProps): React.JSX.Element {
  return (
    <SettingsSection icon="folder" title="永久分组">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-tertiary mb-1">
            {descriptions.maxGroups.label}
          </label>
          <input
            type="number"
            value={config.maxGroups}
            onChange={(e) => updateConfig('maxGroups', parseInt(e.target.value))}
            min={1}
            max={10}
            className="w-full px-3 py-2 bg-tertiary rounded"
          />
        </div>
        <div>
          <label className="block text-sm text-tertiary mb-1">
            {descriptions.maxItemsPerGroup.label}
          </label>
          <input
            type="number"
            value={config.maxItemsPerGroup}
            onChange={(e) => updateConfig('maxItemsPerGroup', parseInt(e.target.value))}
            min={1}
            max={50}
            className="w-full px-3 py-2 bg-tertiary rounded"
          />
        </div>
        <div>
          <label className="block text-sm text-tertiary mb-1">
            {descriptions.totalPermanentLimit.label}
          </label>
          <input
            type="number"
            value={config.totalPermanentLimit}
            onChange={(e) => updateConfig('totalPermanentLimit', parseInt(e.target.value))}
            min={1}
            max={200}
            className="w-full px-3 py-2 bg-tertiary rounded"
          />
        </div>
      </div>
    </SettingsSection>
  );
}
