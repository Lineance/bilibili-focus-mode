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
        Windows 可从开始菜单或托盘查看状态、暂停和恢复保护。扩展失联时，本地程序会发出系统提醒并给予恢复时间。
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
        此开关只控制通信。如果本地保护已启用，关闭通信并保存配置也会触发倒计时。请先从托盘暂停保护，或运行 monitor.exe disable。
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer">安装与启用步骤</summary>
        <ol className="mt-3 list-decimal list-inside space-y-3">
          <li>
            解压 Windows 发行包，保留三个可执行文件。双击 bilibili-focus-watchdog.exe，在配置窗口中选择浏览器、独立数据目录并填写下方扩展 ID。
            <details className="mt-2"><summary className="cursor-pointer">命令行安装方式</summary>
              <code className="block mt-2 p-2 bg-tertiary rounded break-all select-all">{installCommand}</code>
            </details>
          </li>
          <li>保存本地配置后，开启上方通信开关并保存扩展配置。</li>
          <li>在本地状态窗口测试通知并运行诊断。确认握手通过后，点击“恢复保护”。</li>
          <li>日常使用从托盘暂停、恢复或停止；也可使用 <code>monitor.exe disable</code> 和 <code>monitor.exe uninstall</code>。</li>
        </ol>
        <p className="mt-3 text-tertiary">扩展 ID：<code className="select-all">{extensionId}</code></p>
        <p className="mt-2 text-tertiary">
          当前支持 Windows 与 Chrome/Chromium。建议使用独立的数据目录；同一数据目录的多个 profile 会一起关闭。
        </p>
      </details>
    </div>
  );
}
