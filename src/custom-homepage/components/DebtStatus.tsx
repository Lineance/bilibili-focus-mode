import React, { useMemo } from 'react';
import { MS_PER_MINUTE } from '@core/constants';
import type { DebtAccount, ExtensionConfig, WatchRecord } from '@core/types';
import { useNow } from '@hooks/useNow';

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
  if (type === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (type === 'week') {
    const day = now.getDay() || 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1).getTime();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function aggregateByPeriod(history: WatchRecord[], since: number): TimeStats {
  const stats: TimeStats = { entertainment: 0, learning: 0, music: 0, total: 0 };
  for (const r of history) {
    if (r.startedAt < since) continue;
    if (r.tag === 'ENTERTAINMENT') stats.entertainment += r.totalMinutes;
    else if (r.tag === 'LEARNING') stats.learning += r.totalMinutes;
    else if (r.tag === 'MUSIC') stats.music += r.totalMinutes;
    stats.total += r.totalMinutes;
  }
  return stats;
}

function formatMinutes(m: number): string {
  if (m < 60) return `${Math.round(m)}分钟`;
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return min > 0 ? `${h}小时${min}分` : `${h}小时`;
}

function TimeStatsRow({ label, stats }: { label: string; stats: TimeStats }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-secondary last:border-0">
      <span className="text-secondary text-sm">{label}</span>
      <div className="flex gap-3 text-sm">
        <span className="text-warning">🎮{formatMinutes(stats.entertainment)}</span>
        <span className="text-info">🎵{formatMinutes(stats.music)}</span>
        <span className="text-success">📚{formatMinutes(stats.learning)}</span>
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
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 cursor-pointer" onClick={openStats}>
        <span>📊</span>
        <span>观看统计</span>
        <span className="text-xs text-muted ml-auto">点击查看详情 →</span>
      </h2>

      {/* 主债务显示 */}
      <div className={`p-4 rounded-lg mb-4 ${effectiveBankrupt ? 'bg-error/20 border border-error/50' : 'bg-tertiary'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold mb-1">
              {debt < 0
                ? `信用额度: ${Math.abs(debt).toFixed(1)} 分钟`
                : `${debt.toFixed(1)} 分钟`}
            </div>
            <p className="text-sm text-secondary">
              {effectiveBankrupt
                ? '⚠️ 已破产，暂停新申请'
                : debt > config.maxDebtMinutes * 0.5
                  ? '债务较高，建议观看学习类视频'
                  : '债务状况良好'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">累计观看</p>
            <p className="text-xl font-bold">{formatMinutes(totalStats.total)}</p>
          </div>
        </div>
      </div>

      {/* 分时段统计 */}
      <div className="bg-tertiary rounded-lg p-4">
        <TimeStatsRow label="📅 今日" stats={todayStats} />
        <TimeStatsRow label="📆 本周" stats={weekStats} />
        <TimeStatsRow label="🗓️ 本月" stats={monthStats} />
      </div>
    </div>
  );
}