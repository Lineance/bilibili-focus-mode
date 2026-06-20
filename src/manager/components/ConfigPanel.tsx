import React, { useEffect, useState, useMemo } from 'react';

import { DEFAULT_CONFIG } from '@core/constants';
import { ConfigService } from '@core/services';
import type { ExtensionConfig } from '@core/types';

import { TimeWindowSettings } from './config/TimeWindowSettings';
import { LimboSettings } from './config/LimboSettings';
import { InstantSettings } from './config/InstantSettings';
import { CoolingSettings } from './config/CoolingSettings';
import { FuseSettings } from './config/FuseSettings';
import { PermanentGroupSettings } from './config/PermanentGroupSettings';
import { DebtSettings } from './config/DebtSettings';
import { GhostSettings } from './config/GhostSettings';
import { QuotaSettings } from './config/QuotaSettings';
import { DetectionSettings } from './config/DetectionSettings';
import { StyleSimplificationSettings } from './config/StyleSimplificationSettings';
import { SearchSimplificationSettings } from './config/SearchSimplificationSettings';
import { DailyBypassSettings } from './config/DailyBypassSettings';
import { NativeMessagingSettings } from './config/NativeMessagingSettings';

export function ConfigPanel(): React.JSX.Element {
  const [config, setConfig] = useState<ExtensionConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const configService = useMemo(() => new ConfigService(), []);

  useEffect(() => {
    const loadConfig = async () => {
      const loaded = await configService.loadConfig();
      setConfig(loaded);
    };
    loadConfig();
  }, [configService]);

  const handleSave = async () => {
    const result = await configService.saveConfig(config);
    if (result.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const errors = result.error.details as { field: string; message: string }[] | undefined;
      alert('保存失败：' + errors?.map(e => e.message).join(', '));
    }
  };

  const handleReset = async () => {
    if (confirm('确定要重置为默认配置吗？')) {
      await configService.resetToDefaults();
      const defaultConfig = await configService.loadConfig();
      setConfig(defaultConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const descriptions = configService.getConfigDescriptions();

  const updateConfig = (field: keyof ExtensionConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">配置</h2>
        <div className="flex gap-2">
          {saved && (
            <span className="px-3 py-1 bg-green-600 rounded text-sm">
              ✓ 已保存
            </span>
          )}
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-tertiary border border-secondary rounded text-sm hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            重置默认
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-accent-primary rounded text-sm hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存配置
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <TimeWindowSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <LimboSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <InstantSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <CoolingSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <FuseSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <PermanentGroupSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <DebtSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <GhostSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <QuotaSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <DetectionSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <DailyBypassSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <NativeMessagingSettings config={config} updateConfig={updateConfig} />
        <StyleSimplificationSettings config={config} updateConfig={updateConfig} />
        <SearchSimplificationSettings config={config} updateConfig={updateConfig} />
      </div>
    </div>
  );
}
