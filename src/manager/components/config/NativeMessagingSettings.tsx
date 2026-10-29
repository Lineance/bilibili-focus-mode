import type { ExtensionConfig } from '@core/types';
import { Icon, SettingsSection, Toggle } from '@ui';

import { NativeMonitorStatus } from './NativeMonitorStatus';

interface NativeMessagingSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function NativeMessagingSettings({ config, updateConfig }: NativeMessagingSettingsProps): React.JSX.Element {
  const extensionId = chrome.runtime.id ?? '<扩展ID>';
  const installCommand = `monitor.exe install --browser "<chrome.exe绝对路径>" --user-data-dir "<Chrome数据目录>" --extension-id ${extensionId} --allow-default-profile --autostart`;
  const enabled = config.nativeMessagingEnabled;

  return (
    <SettingsSection
      icon="monitor"
      title="本地监控"
      description="通过 Chrome Native Messaging 连接本地 Watchdog，连接状态和保护状态分开显示。"
    >
      <div className="fm-native-control">
        <div className="min-w-0">
          <div className="fm-field__label">允许扩展连接本地监控程序</div>
          <p className="fm-field__desc">
            {enabled ? '扩展会保持心跳连接。' : '关闭后，本地保护不会收到扩展心跳。'}
          </p>
        </div>
        <Toggle
          checked={enabled}
          label="允许扩展连接本地监控程序"
          onChange={(checked) => updateConfig('nativeMessagingEnabled', checked)}
        />
      </div>

      <NativeMonitorStatus />

      <div className="fm-callout fm-callout--warning flex items-start gap-2">
        <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
        <span>保护启用前必须保持 Watchdog 运行、扩展实时连接且完成登记验证。保护范围是登记数据目录对应的整个 Chrome 实例。</span>
      </div>

      <details className="fm-details">
        <summary className="fm-details__summary">安装与排错</summary>
        <div className="fm-details__body">
          <ol className="list-decimal list-inside space-y-2">
            <li>保留发行包中的三个 exe，运行配置引导并填写当前扩展 ID。</li>
            <li>保存本地配置后，打开上方通信开关并保存扩展配置。</li>
            <li>确认状态为“已连接”后，再从托盘或 monitor.exe enable 开启保护。</li>
          </ol>
          <details className="mt-3">
            <summary className="fm-details__summary">命令行安装方式</summary>
            <code className="fm-code">{installCommand}</code>
          </details>
          <p className="mt-3 text-tertiary">扩展 ID：<code className="select-all">{extensionId}</code></p>
          <p className="mt-2 text-tertiary">默认建议使用独立数据目录；选择默认 Chrome 时，保护会作用于该默认目录的整个浏览器实例。</p>
        </div>
      </details>
    </SettingsSection>
  );
}
