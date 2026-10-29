import type { MonitorState, NativeConnectionState } from '@core/nativeMessaging';
import { Button, Icon, type IconName } from '@ui';
import { useNativeMonitor } from '@hooks/useNativeMonitor';

const CONNECTION_LABELS: Record<NativeConnectionState, string> = {
  disconnected: '未连接', connecting: '正在连接', connected: '已连接', error: '连接异常',
};
const CONNECTION_ICONS: Record<NativeConnectionState, IconName> = {
  disconnected: 'alert', connecting: 'refresh', connected: 'check', error: 'alert',
};
const MONITOR_LABELS: Record<MonitorState, string> = {
  idle: '已启用，等待浏览器', awaitingExtension: '等待扩展恢复', monitoring: '保护运行中',
  gracePeriod: '恢复倒计时', closing: '正在请求关闭浏览器', terminating: '正在终止浏览器',
  paused: '本地保护已暂停', faulted: '监控故障，请运行本地诊断', wouldClose: '模拟模式：已达到关闭条件',
};

/** Connection and enforcement remain distinct so a successful Port cannot imply protection. */
export function NativeMonitorStatus(): React.JSX.Element {
  const { status, refresh } = useNativeMonitor();
  const monitor = status.state === 'connected' ? status.monitor : null;
  const protectionLabel = !monitor ? '尚未确认，请检查本地监控程序'
    : !monitor.watchdogRunning ? '本地监控程序未运行'
    : monitor.dryRun ? '模拟模式，未启用实际关闭'
    : !monitor.enabled ? '本地保护已暂停'
    : !monitor.verified ? '尚未完成登记验证'
    : MONITOR_LABELS[monitor.state];
  const statusLabel = CONNECTION_LABELS[status.state];

  return (
    <div className={`fm-monitor-status fm-monitor-status--${status.state}`} aria-live="polite">
      <div className="fm-monitor-status__header">
        <div className="fm-monitor-status__title">
          <Icon name={CONNECTION_ICONS[status.state]} size={16} />
          <span>连接状态：{statusLabel}</span>
        </div>
        <Button variant="subtle" size="sm" icon="refresh" onClick={() => { void refresh(); }}>
          刷新
        </Button>
      </div>
      <div className="fm-monitor-status__line">
        <span className="fm-monitor-status__label">保护状态</span>
        <span className="fm-monitor-status__value">{protectionLabel}</span>
      </div>
      {monitor?.targetPid && (
        <div className="fm-monitor-status__line">
          <span className="fm-monitor-status__label">登记进程</span>
          <span className="fm-monitor-status__value">{monitor.targetPid}</span>
        </div>
      )}
      {monitor?.dryRun && <p className="text-warning">当前为模拟模式，不会关闭浏览器。</p>}
      {monitor && !monitor.verified && <p className="text-warning">登记尚未完成握手验证。</p>}
      {(status.reason || monitor?.reason) && (
        <p className="break-words text-warning">{status.reason || monitor?.reason}</p>
      )}
    </div>
  );
}
