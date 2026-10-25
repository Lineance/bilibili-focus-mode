import React, { useEffect, useState } from 'react';
import type { ExtensionConfig } from '@core/types';
import { Card, Icon, type IconName } from '@ui';

interface QuickActionsProps {
  config: ExtensionConfig;
}

const ACTIONS: Array<{ tab: string; label: string; icon: IconName }> = [
  { tab: 'limbo', label: '待审池', icon: 'list' },
  { tab: 'stats', label: '统计', icon: 'chart' },
  { tab: 'config', label: '配置', icon: 'sliders' },
  { tab: 'theme', label: '主题', icon: 'palette' },
];

export function QuickActions({ config }: QuickActionsProps): React.JSX.Element {
  const [timeWindowInfo, setTimeWindowInfo] = useState<{ inWindow: boolean; nextWindow: string }>({
    inWindow: true,
    nextWindow: '',
  });

  useEffect(() => {
    const checkTimeWindow = () => {
      if (!config.timeWindowEnabled) {
        setTimeWindowInfo({ inWindow: true, nextWindow: '' });
        return;
      }

      const now = new Date();
      const [startHour, startMinute] = config.windowStart.split(':').map(Number);
      const [endHour, endMinute] = config.windowEnd.split(':').map(Number);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      const inWindow = endMinutes >= startMinutes
        ? currentMinutes >= startMinutes && currentMinutes <= endMinutes
        : currentMinutes >= startMinutes || currentMinutes <= endMinutes;

      if (inWindow) {
        setTimeWindowInfo({ inWindow: true, nextWindow: '' });
      } else {
        const minutesUntil = currentMinutes < startMinutes
          ? startMinutes - currentMinutes
          : 24 * 60 - currentMinutes + startMinutes;
        const hours = Math.floor(minutesUntil / 60);
        const mins = minutesUntil % 60;
        setTimeWindowInfo({
          inWindow: false,
          nextWindow: hours > 0 ? `${hours} 小时 ${mins} 分` : `${mins} 分钟`,
        });
      }
    };

    checkTimeWindow();
    const interval = window.setInterval(checkTimeWindow, 60_000);
    return () => window.clearInterval(interval);
  }, [config.timeWindowEnabled, config.windowStart, config.windowEnd]);

  const openManager = (tab?: string) => {
    const url = chrome.runtime.getURL('src/manager/index.html');
    window.open(tab ? `${url}#${tab}` : url, '_blank');
  };

  return (
    <Card>
      <h2 className="fm-section-title">
        <Icon name="bolt" size={16} />
        快捷操作
      </h2>

      <div className="space-y-3">
        {config.timeWindowEnabled && (
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: timeWindowInfo.inWindow
                ? 'color-mix(in srgb, var(--fm-success) 35%, transparent)'
                : 'color-mix(in srgb, var(--fm-warning) 35%, transparent)',
              background: timeWindowInfo.inWindow
                ? 'color-mix(in srgb, var(--fm-success) 9%, transparent)'
                : 'color-mix(in srgb, var(--fm-warning) 9%, transparent)',
            }}
          >
            <p
              className="flex items-center gap-1.5 text-[12.5px] font-medium"
              style={{ color: timeWindowInfo.inWindow ? 'var(--fm-success)' : 'var(--fm-warning)' }}
            >
              <Icon name={timeWindowInfo.inWindow ? 'check' : 'clock'} size={14} />
              {timeWindowInfo.inWindow ? '当前在审批时间' : '当前不在审批时间'}
            </p>
            {!timeWindowInfo.inWindow && timeWindowInfo.nextWindow && (
              <p className="mt-1 text-[11.5px] text-tertiary">距离下次审批：{timeWindowInfo.nextWindow}</p>
            )}
            <p className="mt-1 text-[11px] text-muted">
              审批时间 {config.windowStart} – {config.windowEnd}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action.tab}
              type="button"
              onClick={() => openManager(action.tab)}
              className="flex items-center gap-2 rounded-lg border border-secondary px-3 py-2 text-[12.5px] text-secondary transition-colors hover:border-accent/50 hover:text-primary"
            >
              <Icon name={action.icon} size={15} />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
