import React, { useEffect, useState } from 'react';
import type { ExtensionConfig } from '@core/types';

interface QuickActionsProps {
  config: ExtensionConfig;
}

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

      let inWindow: boolean;
      if (endMinutes >= startMinutes) {
        inWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        inWindow = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }

      if (inWindow) {
        setTimeWindowInfo({ inWindow: true, nextWindow: '' });
      } else {
        // 计算距离下次窗口的时间
        let minutesUntil: number;
        if (currentMinutes < startMinutes) {
          minutesUntil = startMinutes - currentMinutes;
        } else {
          minutesUntil = (24 * 60 - currentMinutes) + startMinutes;
        }
        const hours = Math.floor(minutesUntil / 60);
        const mins = minutesUntil % 60;
        setTimeWindowInfo({
          inWindow: false,
          nextWindow: hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`,
        });
      }
    };

    checkTimeWindow();
    const interval = setInterval(checkTimeWindow, 60000);
    return () => clearInterval(interval);
  }, [config.timeWindowEnabled, config.windowStart, config.windowEnd]);

  const openManager = (tab?: string) => {
    const url = chrome.runtime.getURL('src/manager/index.html');
    window.open(tab ? `${url}#${tab}` : url, '_blank');
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>⚡</span>
        <span>快捷操作</span>
      </h2>

      <div className="space-y-3">
        {/* 时间窗口状态 */}
        {config.timeWindowEnabled && (
          <div className={`rounded-lg p-3 ${timeWindowInfo.inWindow ? 'bg-success/20 border border-success/50' : 'bg-warning/20 border border-warning/50'}`}>
            <p className={`font-medium ${timeWindowInfo.inWindow ? 'text-success' : 'text-warning'}`}>
              {timeWindowInfo.inWindow ? '✅ 当前在审批时间' : '⏰ 当前不在审批时间'}
            </p>
            {!timeWindowInfo.inWindow && timeWindowInfo.nextWindow && (
              <p className="text-sm text-secondary mt-1">
                距离下次审批时间：{timeWindowInfo.nextWindow}
              </p>
            )}
            <p className="text-xs text-muted mt-1">
              审批时间：{config.windowStart} - {config.windowEnd}
            </p>
          </div>
        )}

        {/* 快捷按钮 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => openManager('limbo')}
            className="btn-secondary text-center"
          >
            📋 待审池
          </button>
          <button
            onClick={() => openManager('stats')}
            className="btn-secondary text-center"
          >
            📊 统计
          </button>
          <button
            onClick={() => openManager('config')}
            className="btn-secondary text-center"
          >
            ⚙️ 配置
          </button>
          <button
            onClick={() => openManager('theme')}
            className="btn-secondary text-center"
          >
            🎨 主题
          </button>
        </div>
      </div>
    </div>
  );
}