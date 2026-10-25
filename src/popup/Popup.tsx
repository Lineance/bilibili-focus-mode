import { ThemeService } from '@core/services';
import { getTodayKey } from '@core/utils/dateUtils';
import { useStorage } from '@hooks/useStorage';
import { useEffect, useState } from 'react';
import { Icon, IconButton } from '@ui';
import './index.css';

const themeService = ThemeService.getInstance();

export function Popup(): React.JSX.Element {
  const storage = useStorage();
  const config = storage.config;
  const permanentCount = storage.permanentGroups?.reduce((sum, group) => sum + group.items.length, 0) ?? 0;
  const debt = Math.round(storage.debtAccount?.currentDebt ?? 0);
  const behaviorLog = storage.behaviorLog;
  const usedToday = behaviorLog.lastQuotaResetDate === getTodayKey()
    ? behaviorLog.dailyBypassesUsedToday
    : 0;
  const remainingBypasses = Math.max(0, (config?.dailyBypassQuota ?? 3) - usedToday);
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
          <p className="fm-popup__stat-value">{permanentCount}</p>
          <p className="fm-popup__stat-label">永久放行</p>
        </div>
        <div>
          <p className="fm-popup__stat-value">{remainingBypasses}</p>
          <p className="fm-popup__stat-label">今日全量</p>
        </div>
        <div>
          <p className="fm-popup__stat-value" style={{ color: debt > 0 ? 'var(--fm-warning)' : undefined }}>
            {debt}
          </p>
          <p className="fm-popup__stat-label">债务 · 分钟</p>
        </div>
      </div>

      <div className="fm-popup__window" data-active={remainingBypasses > 0}>
        <Icon name={remainingBypasses > 0 ? 'check' : 'clock'} size={14} />
        <span>{remainingBypasses > 0 ? `今日还可全量放行 ${remainingBypasses} 次` : '今日全量放行次数已用完'}</span>
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
          onClick={() => chrome.tabs.create({ url: 'https://www.bilibili.com' })}
          className="fm-btn fm-btn--ghost fm-btn--block"
        >
          前往 B 站
        </button>
      </div>
    </div>
  );
}
