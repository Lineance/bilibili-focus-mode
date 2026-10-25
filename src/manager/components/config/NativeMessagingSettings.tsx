import type { ExtensionConfig } from '@core/types';
import { NativeMonitorStatus } from './NativeMonitorStatus';

interface NativeMessagingSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function NativeMessagingSettings({ config, updateConfig }: NativeMessagingSettingsProps): React.JSX.Element {
  const extensionId = chrome.runtime.id ?? '<扩展ID>';
  const installCommand = `monitor.exe install --browser "<chrome.exe绝对路径>" --user-data-dir "<独立浏览器数据目录>" --extension-id ${extensionId} --autostart`;
  return (
    <div className="bg-secondary p-4 rounded-lg space-y-3">
      <h3 className="text-lg font-medium">🔗 外部监控连接</h3>
      <p className="text-sm text-tertiary">
        本地监控程序在扩展失去连接后给予恢复时间，超时则关闭登记的浏览器实例。
      </p>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.nativeMessagingEnabled}
          onChange={(event) => updateConfig('nativeMessagingEnabled', event.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span>启用与本地监控程序的通信</span>
      </label>
      <NativeMonitorStatus />
      <p className="text-sm text-warning">
        此开关只控制通信。如果本地保护已启用，关闭通信也会触发倒计时。请先运行 monitor.exe disable 暂停保护。
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer">安装与启用步骤</summary>
        <ol className="mt-3 list-decimal list-inside space-y-3">
          <li>
            编译或解压 Windows 监控程序，在同一目录保留三个可执行文件，然后登记当前扩展：
            <code className="block mt-2 p-2 bg-tertiary rounded break-all select-all">{installCommand}</code>
          </li>
          <li>运行 <code>monitor.exe start</code>，再开启上方通信开关。</li>
          <li>运行 <code>monitor.exe doctor</code>。握手检查通过后，运行 <code>monitor.exe enable</code> 启用保护。</li>
          <li>暂停使用 <code>monitor.exe disable</code>；移除登记使用 <code>monitor.exe uninstall</code>。</li>
        </ol>
        <p className="mt-3 text-tertiary">扩展 ID：<code className="select-all">{extensionId}</code></p>
        <p className="mt-2 text-tertiary">
          当前支持 Windows 与 Chrome/Chromium。建议使用独立的数据目录；同一数据目录的多个 profile 会一起关闭。
        </p>
      </details>
    </div>
  );
}
