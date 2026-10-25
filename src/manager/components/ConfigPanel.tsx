import React, { useEffect, useMemo, useState } from 'react';

import { DEFAULT_CONFIG } from '@core/constants';
import { ConfigService } from '@core/services';
import type { ExtensionConfig } from '@core/types';
import { Button, PageIntro, toast } from '@ui';

import { PermanentGroupSettings } from './config/PermanentGroupSettings';
import { DebtSettings } from './config/DebtSettings';
import { DetectionSettings } from './config/DetectionSettings';
import { StyleSimplificationSettings } from './config/StyleSimplificationSettings';
import { SearchSimplificationSettings } from './config/SearchSimplificationSettings';
import { DailyBypassSettings } from './config/DailyBypassSettings';
import { NativeMessagingSettings } from './config/NativeMessagingSettings';
import { AppearanceEnhancementSettings } from './config/AppearanceEnhancementSettings';
import { LiveEnhancementSettings } from './config/LiveEnhancementSettings';
import { VideoPlayerEnhancementSettings } from './config/VideoPlayerEnhancementSettings';
import { ThemeEnhancementSettings } from './config/ThemeEnhancementSettings';

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
      toast.success('配置已保存');
      window.setTimeout(() => setSaved(false), 2000);
    } else {
      const errors = result.error.details as { field: string; message: string }[] | undefined;
      toast.error('保存失败：' + (errors?.map((e) => e.message).join('，') ?? '未知错误'));
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要重置为默认配置吗？')) {
      return;
    }
    await configService.resetToDefaults();
    const defaultConfig = await configService.loadConfig();
    setConfig(defaultConfig);
    setSaved(true);
    toast.success('已重置为默认配置');
    window.setTimeout(() => setSaved(false), 2000);
  };

  const descriptions = configService.getConfigDescriptions();

  const updateConfig = (field: keyof ExtensionConfig, value: unknown) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <PageIntro
        eyebrow="Settings"
        title="配置"
        description="所有规则保存在本地。修改后需要点击「保存配置」才会生效。"
      />

      <div className="sticky top-[73px] z-20 -mx-1 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-secondary px-4 py-3 backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--fm-bg-primary) 88%, transparent)' }}
      >
        <p className="text-[12px] text-tertiary">
          {saved ? '✓ 已保存' : '修改后记得保存'}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon="history" onClick={handleReset}>
            重置默认
          </Button>
          <Button variant="primary" size="sm" icon="check" onClick={handleSave}>
            保存配置
          </Button>
        </div>
      </div>

      <div className="fm-config">
        <PermanentGroupSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <DebtSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <DetectionSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <DailyBypassSettings config={config} updateConfig={updateConfig} descriptions={descriptions} />
        <NativeMessagingSettings config={config} updateConfig={updateConfig} />
        <StyleSimplificationSettings config={config} updateConfig={updateConfig} />
        <SearchSimplificationSettings config={config} updateConfig={updateConfig} />
        <AppearanceEnhancementSettings config={config} updateConfig={updateConfig} />
        <LiveEnhancementSettings config={config} updateConfig={updateConfig} />
        <VideoPlayerEnhancementSettings config={config} updateConfig={updateConfig} />
        <ThemeEnhancementSettings config={config} updateConfig={updateConfig} />
      </div>
    </div>
  );
}
