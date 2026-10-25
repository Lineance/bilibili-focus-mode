import React, { useEffect, useMemo, useState } from 'react';
import { sendMessage } from 'webext-bridge/popup';
import type { BehaviorLogState, ExtensionConfig } from '@core/types';
import { getTodayKey, resetQuotaIfNeeded } from '@core/utils/dateUtils';
import { Button, Card, Icon, StatusChip, toast } from '@ui';

interface BypassStatusProps {
  config: ExtensionConfig;
  behaviorLog: BehaviorLogState;
}

function formatDuration(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} 小时 ${mins} 分` : `${hours} 小时`;
}

export function BypassStatus({ config, behaviorLog }: BypassStatusProps): React.JSX.Element {
  const [bypassUntil, setBypassUntil] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const loadBypassUntil = async () => {
      const data = await chrome.storage.local.get('dailyBypassUntil');
      setBypassUntil((data.dailyBypassUntil as number) || 0);
    };
    loadBypassUntil();

    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.dailyBypassUntil) {
        setBypassUntil((changes.dailyBypassUntil.newValue as number) || 0);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
      window.clearInterval(timer);
    };
  }, []);

  const isBypassActive = currentTime < bypassUntil;

  const remainingUses = useMemo(() => {
    const needsReset = resetQuotaIfNeeded(behaviorLog.lastQuotaResetDate, getTodayKey());
    const used = needsReset ? 0 : (behaviorLog.dailyBypassesUsedToday || 0);
    return Math.max(0, config.dailyBypassQuota - used);
  }, [behaviorLog, config.dailyBypassQuota]);

  const handleBypass = async () => {
    try {
      const response = await sendMessage('daily-bypass', {}) as { success?: boolean; message?: string };
      if (response?.success) {
        const data = await chrome.storage.local.get('dailyBypassUntil');
        setBypassUntil((data.dailyBypassUntil as number) || 0);
        toast.success('已开启每日放行');
      } else {
        toast.error(response?.message || '操作失败');
      }
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  return (
    <Card>
      <h2 className="fm-section-title">
        <Icon name="shield" size={16} />
        每日放行
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-secondary">今日剩余次数</span>
          <span
            className="font-mono text-[15px] font-semibold tabular-nums"
            style={{ color: remainingUses > 0 ? 'var(--fm-success)' : 'var(--fm-error)' }}
          >
            {remainingUses} / {config.dailyBypassQuota}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-secondary">每次放行时长</span>
          <span className="text-[12.5px] text-primary">{config.dailyBypassDurationMinutes} 分钟</span>
        </div>

        {isBypassActive ? (
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: 'color-mix(in srgb, var(--fm-success) 35%, transparent)',
              background: 'color-mix(in srgb, var(--fm-success) 9%, transparent)',
            }}
          >
            <StatusChip tone="success" icon="check">放行中</StatusChip>
            <p className="mt-2 text-[11.5px] text-tertiary">剩余 {formatDuration(bypassUntil - currentTime)}</p>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-tertiary p-3">
            <span className="text-[12px] text-tertiary">未激活</span>
            <span className="text-[11px] text-muted">每天有 {config.dailyBypassQuota} 次机会</span>
          </div>
        )}

        <Button
          variant={isBypassActive || remainingUses <= 0 ? 'ghost' : 'primary'}
          block
          icon="bolt"
          onClick={handleBypass}
          disabled={isBypassActive || remainingUses <= 0}
        >
          {isBypassActive
            ? '放行中…'
            : remainingUses > 0
              ? `立即放行 ${config.dailyBypassDurationMinutes} 分钟`
              : '今日次数已用完'}
        </Button>
      </div>
    </Card>
  );
}
