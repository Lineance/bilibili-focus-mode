import React, { useEffect, useState } from 'react';
import type { BehaviorLogState, ExtensionConfig } from '@core/types';
import { getTodayKey, resetQuotaIfNeeded } from '@core/utils/dateUtils';

interface BypassStatusProps {
  config: ExtensionConfig;
  behaviorLog: BehaviorLogState;
}

export function BypassStatus({ config, behaviorLog }: BypassStatusProps): React.JSX.Element {
  const [bypassUntil, setBypassUntil] = useState<number>(0);

  useEffect(() => {
    const loadBypassUntil = async () => {
      const data = await chrome.storage.local.get('dailyBypassUntil');
      setBypassUntil((data.dailyBypassUntil as number) || 0);
    };
    loadBypassUntil();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.dailyBypassUntil) {
        setBypassUntil((changes.dailyBypassUntil.newValue as number) || 0);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const now = Date.now();
  const isBypassActive = now < bypassUntil;

  const today = getTodayKey();
  const needsReset = resetQuotaIfNeeded(behaviorLog.lastQuotaResetDate, today);
  const dailyBypassesUsedToday = needsReset ? 0 : (behaviorLog.dailyBypassesUsedToday || 0);
  const remainingUses = Math.max(0, config.dailyBypassQuota - dailyBypassesUsedToday);

  const formatTime = (ms: number): string => {
    const minutes = Math.ceil(ms / (1000 * 60));
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  const handleBypass = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'daily-bypass' });
      if (response?.success) {
        // 重新加载状态
        const data = await chrome.storage.local.get('dailyBypassUntil');
        setBypassUntil((data.dailyBypassUntil as number) || 0);
      } else {
        alert(response?.message || '操作失败');
      }
    } catch {
      alert('操作失败，请重试');
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🛡️</span>
        <span>每日放行状态</span>
      </h2>

      <div className="space-y-3">
        {/* 放行次数 */}
        <div className="flex items-center justify-between">
          <span className="text-secondary">今日剩余次数</span>
          <span className={`font-bold text-lg ${remainingUses > 0 ? 'text-success' : 'text-error'}`}>
            {remainingUses}/{config.dailyBypassQuota}
          </span>
        </div>

        {/* 放行时长配置 */}
        <div className="flex items-center justify-between">
          <span className="text-secondary">每次放行时长</span>
          <span className="text-primary">{config.dailyBypassDurationMinutes}分钟</span>
        </div>

        {/* 当前状态 */}
        {isBypassActive ? (
          <div className="bg-success/20 border border-success/50 rounded-lg p-3">
            <p className="text-success font-medium">✅ 放行中</p>
            <p className="text-sm text-secondary mt-1">
              剩余 {formatTime(bypassUntil - now)}
            </p>
          </div>
        ) : (
          <div className="bg-tertiary rounded-lg p-3">
            <p className="text-muted">未激活</p>
          </div>
        )}

        {/* 放行按钮 */}
        <button
          onClick={handleBypass}
          disabled={isBypassActive || remainingUses <= 0}
          className={`w-full py-2 rounded-lg font-medium transition-all ${
            isBypassActive || remainingUses <= 0
              ? 'bg-tertiary text-muted cursor-not-allowed'
              : 'bg-success text-white hover:opacity-90'
          }`}
        >
          {isBypassActive
            ? '放行中...'
            : remainingUses > 0
              ? `立即放行 (${config.dailyBypassDurationMinutes}分钟)`
              : '今日次数已用完'}
        </button>
      </div>
    </div>
  );
}