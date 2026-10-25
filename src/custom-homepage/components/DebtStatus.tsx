import React, { useMemo } from 'react';
import { MS_PER_MINUTE } from '@core/constants';
import type { DebtAccount, ExtensionConfig, WatchRecord } from '@core/types';
import { useNow } from '@hooks/useNow';
import { Card, Icon, Progress, StatusChip } from '@ui';

interface DebtStatusProps {
  account: DebtAccount;
  config: ExtensionConfig;
  watchHistory: WatchRecord[];
}

interface TimeStats {
  entertainment: number;
  learning: number;
  music: number;
  total: number;
}

function getTimeRange(type: 'today' | 'week' | 'month'): number {
  const now = new Date();
  if (type === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (type === 'week') {
    const day = now.getDay() || 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1).getTime();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function aggregateByPeriod(history: WatchRecord[], since: number): TimeStats {
  const stats: TimeStats = { entertainment: 0, learning: 0, music: 0, total: 0 };
  for (const record of history) {
    if (record.startedAt < since) continue;
    if (record.tag === 'ENTERTAINMENT') stats.entertainment += record.totalMinutes;
    else if (record.tag === 'LEARNING') stats.learning += record.totalMinutes;
    else if (record.tag === 'MUSIC') stats.music += record.totalMinutes;
    stats.total += record.totalMinutes;
  }
  return stats;
}

function formatMinutes(m: number): string {
  if (m < 60) return `${Math.round(m)} 分钟`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min > 0 ? `${h} 小时 ${min} 分` : `${h} 小时`;
}

function PeriodRow({ label, stats }: { label: string; stats: TimeStats }) {
  return (
    <div className="flex items-center justify-between border-b border-secondary py-2.5 last:border-0">
      <span className="text-[12px] text-tertiary">{label}</span>
      <div className="flex gap-3">
        <span className="font-mono text-[11.5px] tabular-nums" style={{ color: 'var(--fm-warning)' }}>
          娱乐 {Math.round(stats.entertainment)}
        </span>
        <span className="font-mono text-[11.5px] tabular-nums" style={{ color: 'var(--fm-info)' }}>
          音乐 {Math.round(stats.music)}
        </span>
        <span className="font-mono text-[11.5px] tabular-nums" style={{ color: 'var(--fm-success)' }}>
          学习 {Math.round(stats.learning)}
        </span>
      </div>
    </div>
  );
}

export function DebtStatus({ account, config, watchHistory }: DebtStatusProps): React.JSX.Element {
  const now = useNow(MS_PER_MINUTE);

  const { debt, effectiveBankrupt, totalStats, todayStats, weekStats, monthStats } = useMemo(() => {
    const entertainment = account.totalEntertainmentMinutes ?? 0;
    const learning = account.totalLearningMinutes ?? 0;
    const music = account.totalMusicMinutes ?? 0;
    const entertainmentDebt = entertainment * config.entertainmentRatio;
    const learningRepaid = learning * config.learningRepayRatio;
    const net = entertainmentDebt + learningRepaid;
    const isBankrupt = net >= config.maxDebtMinutes;
    const isLocked = account.bankruptcyEndTime ? now < account.bankruptcyEndTime : false;

    return {
      debt: net,
      effectiveBankrupt: isBankrupt || isLocked,
      totalStats: { entertainment, learning, music, total: entertainment + learning + music },
      todayStats: aggregateByPeriod(watchHistory, getTimeRange('today')),
      weekStats: aggregateByPeriod(watchHistory, getTimeRange('week')),
      monthStats: aggregateByPeriod(watchHistory, getTimeRange('month')),
    };
  }, [account, config, watchHistory, now]);

  const openStats = () => {
    window.open(chrome.runtime.getURL('src/manager/index.html#stats'), '_blank');
  };

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="fm-label">债务账户</p>
          <h2 className="mt-1.5 text-[20px]">观看统计</h2>
        </div>
        <button
          type="button"
          onClick={openStats}
          className="flex items-center gap-1.5 rounded-full border border-secondary px-3 py-1.5 text-[11.5px] text-tertiary transition-colors hover:text-primary"
        >
          详情
          <Icon name="arrowRight" size={13} />
        </button>
      </div>

      <div
        className="rounded-xl border p-4"
        style={{
          background: effectiveBankrupt
            ? 'color-mix(in srgb, var(--fm-error) 9%, transparent)'
            : 'var(--fm-bg-tertiary)',
          borderColor: effectiveBankrupt
            ? 'color-mix(in srgb, var(--fm-error) 35%, transparent)'
            : 'var(--fm-border-secondary)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="fm-label">{debt < 0 ? '可用信用额度' : '当前债务'}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="fm-stat__value text-[30px]">
                {Math.abs(debt).toFixed(1)}
              </span>
              <span className="text-[12px] text-tertiary">分钟</span>
            </div>
          </div>
          <StatusChip
            tone={effectiveBankrupt ? 'error' : debt > config.maxDebtMinutes * 0.5 ? 'warning' : 'success'}
            icon={effectiveBankrupt ? 'alert' : 'check'}
          >
            {effectiveBankrupt
              ? '已破产，暂停新申请'
              : debt > config.maxDebtMinutes * 0.5
                ? '债务较高，建议学习偿还'
                : '债务状况良好'}
          </StatusChip>
        </div>

        <div className="mt-4">
          <Progress
            value={Math.max(0, debt)}
            max={config.maxDebtMinutes}
            tone={effectiveBankrupt ? 'error' : debt > config.maxDebtMinutes * 0.5 ? 'warning' : 'success'}
          />
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>破产阈值 {config.maxDebtMinutes} 分钟</span>
            <span>累计观看 {formatMinutes(totalStats.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-tertiary px-4 py-2">
        <PeriodRow label="今日" stats={todayStats} />
        <PeriodRow label="本周" stats={weekStats} />
        <PeriodRow label="本月" stats={monthStats} />
      </div>
    </Card>
  );
}
