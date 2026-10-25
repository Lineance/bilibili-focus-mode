import type { ExtensionConfig } from '@core/types';

interface NativeMessagingSettingsProps {
  config: ExtensionConfig;
  updateConfig: (field: keyof ExtensionConfig, value: unknown) => void;
}

export function NativeMessagingSettings({ config, updateConfig }: NativeMessagingSettingsProps): React.JSX.Element {
  return (
    <div className="bg-secondary p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-3">🔗 外部监控连接</h3>
      <p className="text-sm text-tertiary mb-3">
        允许外部监控程序（chromium-extension-monitor）通过 Native Messaging 检测扩展状态
      </p>
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.nativeMessagingEnabled}
            onChange={(e) => updateConfig('nativeMessagingEnabled', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span>启用 Native Messaging</span>
        </label>

        {config.nativeMessagingEnabled && (
          <div className="ml-6 p-3 bg-tertiary rounded text-sm">
            <p className="text-warning mb-2">⚠️ 启用后，扩展将尝试连接外部监控程序</p>
            <p className="text-tertiary">需要先安装监控程序：</p>
            <code className="block mt-1 p-2 bg-secondary rounded text-xs">
              chromium-extension-monitor.exe --install-native-host --extension-id &lt;扩展ID&gt;
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
