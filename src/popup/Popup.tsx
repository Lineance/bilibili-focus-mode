import { BILIBILI_BASE_URL } from '@core/constants';
import { ThemeService } from '@core/services';
import { useStorage } from '@hooks/useStorage';
import { useEffect, useState } from 'react';
import { Icon, IconButton } from '@ui';
import './index.css';

const themeService = ThemeService.getInstance();

function isInWindow(config: { timeWindowEnabled: boolean; windowStart: string; windowEnd: string }): boolean {
  if (!config.timeWindowEnabled) return true;
  const [startHour, startMinute] = config.windowStart.split(':').map(Number);
  const [endHour, endMinute] = config.windowEnd.split(':').map(Number);
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return end >= start ? current >= start && current <= end : current >= start || current <= end;
}

export function Popup() {
  const storage = useStorage();
  const config = storage.config;
  const limboCount = storage.limboList?.length ?? 0;
  const instantCount = storage.instantList?.length ?? 0;
  const debt = Math.round(storage.debtAccount?.currentDebt ?? 0);
  const active = config ? isInWindow(config) : true;
  const [mode, setMode] = useState(themeService.getThemeConfig().mode);

  useEffect(() => themeService.subscribe((next) => setMode(next.mode)), []);

  return (
    <div className="fm-popup">
      <div className="fm-popup__head">
        <span className="fm-brand__mark" aria-hidden="true">
          <Icon name="shield" size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="fm-popup__title">Focus Mode</h1>
          <p className="fm-popup__sub">Intentional Entertainment</p>
        </div>
        <IconButton
          icon={mode === 'dark' ? 'sun' : 'moon'}
          label={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          onClick={() => themeService.toggleMode()}
        />
      </div>

      <div className="fm-popup__status">
        <div>
          <p className="fm-popup__stat-value">{limboCount}</p>
          <p className="fm-popup__stat-label">待审</p>
        </div>
        <div>
          <p className="fm-popup__stat-value">{instantCount}</p>
          <p className="fm-popup__stat-label">即时</p>
        </div>
        <div>
          <p className="fm-popup__stat-value" style={{ color: debt > 0 ? 'var(--fm-warning)' : undefined }}>
            {debt}
          </p>
          <p className="fm-popup__stat-label">债务 · 分钟</p>
        </div>
      </div>

      <div className="fm-popup__window" data-active={active}>
        <Icon name={active ? 'check' : 'clock'} size={14} />
        <span>
          {!config?.timeWindowEnabled
            ? '审批窗口已关闭'
            : active
              ? '当前可审批'
              : `下次审批 ${config?.windowStart ?? ''} 起`}
        </span>
      </div>

      <div className="fm-popup__actions">
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          className="fm-btn fm-btn--primary fm-btn--block"
        >
          打开管理页
        </button>
        <button
          type="button"
          onClick={() => chrome.tabs.create({ url: BILIBILI_BASE_URL })}
          className="fm-btn fm-btn--ghost fm-btn--block"
        >
          前往 B 站
        </button>
      </div>

      <p className="fm-popup__hint">
        在播放页点击「加入待审池」提交视频，审批窗口内到管理页处理。
      </p>
    </div>
  );
}
