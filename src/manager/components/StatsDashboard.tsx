import { MS_PER_MINUTE } from '@core/constants';
import React, { useMemo, useState } from 'react';

import type { ExtensionConfig, WatchRecord } from '@core/types';
import { useNow } from '@hooks/useNow';

type TimeRange = 'day' | 'week' | 'month';

function formatMinutes(m: number): string {
  if (m < 1) return '不到1分钟';
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  if (h === 0) return `${min}分钟`;
  if (min === 0) return `${h}小时`;
  return `${h}小时${min}分钟`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function getTagEmoji(tag: string): string {
  switch (tag) {
    case 'LEARNING': return '📚';
    case 'MUSIC': return '🎵';
    default: return '🎮';
  }
}

function getTagLabel(tag: string): string {
  switch (tag) {
    case 'LEARNING': return '学习';
    case 'MUSIC': return '音乐';
    default: return '娱乐';
  }
}

export function StatsDashboard({
  watchHistory,
  account,
  config,
}: {
  watchHistory: WatchRecord[];
  account?: {
    currentDebt: number;
    totalEntertainmentMinutes?: number;
    totalLearningMinutes?: number;
    totalMusicMinutes?: number;
    bankruptcyEndTime?: number | null;
  };
  config: ExtensionConfig;
}): React.JSX.Element {
  useNow(MS_PER_MINUTE); // trigger re-renders for real-time updates
  const [timeRange, setTimeRange] = useState<TimeRange>('day');

  const rangeStart = useMemo(() => {
    const d = new Date();
    if (timeRange === 'day') {
      d.setHours(0, 0, 0, 0);
    } else if (timeRange === 'week') {
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
    } else {
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
    }
    return d.getTime();
  }, [timeRange]);

  const filteredRecords = useMemo(() => {
    return watchHistory.filter((r) => r.startedAt >= rangeStart);
  }, [watchHistory, rangeStart]);

  const stats = useMemo(() => {
    let entertainment = 0;
    let learning = 0;
    let music = 0;
    for (const r of filteredRecords) {
      switch (r.tag) {
        case 'LEARNING': learning += r.totalMinutes; break;
        case 'MUSIC': music += r.totalMinutes; break;
        default: entertainment += r.totalMinutes; break;
      }
    }
    return { entertainment, learning, music, total: entertainment + learning + music };
  }, [filteredRecords]);

  const watchLimit = config.dailyWatchLimitMinutes || 180;
  const usagePercent = Math.min(100, Math.round((stats.total / watchLimit) * 100));

  const recentRecords = useMemo(() => {
    return [...watchHistory]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 20);
  }, [watchHistory]);

  // Cumulative stats from debtAccount
  const totalEntertainment = account?.totalEntertainmentMinutes ?? 0;
  const totalLearning = account?.totalLearningMinutes ?? 0;
  const totalMusic = account?.totalMusicMinutes ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">屏幕使用时间</h2>
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {(['day', 'week', 'month'] as TimeRange[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                timeRange === t
                  ? 'bg-accent-primary text-white'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {t === 'day' ? '今日' : t === 'week' ? '本周' : '本月'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Usage Bar */}
      <div className="bg-tertiary rounded-lg p-6 mb-4">
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-3xl font-bold text-primary">
            {formatMinutes(stats.total)}
          </span>
          <span className="text-sm text-secondary">
            / {formatMinutes(watchLimit)} 限额
          </span>
        </div>
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${usagePercent}%`,
              backgroundColor:
                usagePercent >= 90 ? '#ef4444' : usagePercent >= 70 ? '#f59e0b' : '#10b981',
            }}
          />
        </div>
        <p className="text-sm text-secondary mt-2">
          {usagePercent >= 90
            ? '⚠️ 已接近今日观看限额'
            : usagePercent >= 70
              ? '观看时间较多，注意休息'
              : '观看时间健康'}
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-warning/10 border border-warning p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎮</span>
            <h3 className="font-medium text-warning">娱乐</h3>
          </div>
          <div className="text-2xl font-bold text-warning">
            {formatMinutes(stats.entertainment)}
          </div>
        </div>
        <div className="bg-info/10 border border-info p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎵</span>
            <h3 className="font-medium text-info">音乐</h3>
          </div>
          <div className="text-2xl font-bold text-info">
            {formatMinutes(stats.music)}
          </div>
        </div>
        <div className="bg-success/10 border border-success p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📚</span>
            <h3 className="font-medium text-success">学习</h3>
          </div>
          <div className="text-2xl font-bold text-success">
            {formatMinutes(stats.learning)}
          </div>
        </div>
      </div>

      {/* Cumulative Stats */}
      <div className="bg-tertiary rounded-lg p-4 mb-4">
        <h3 className="text-sm font-medium text-primary mb-3">累计观看</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-warning">{formatMinutes(totalEntertainment)}</div>
            <div className="text-xs text-secondary">娱乐</div>
          </div>
          <div>
            <div className="text-lg font-bold text-info">{formatMinutes(totalMusic)}</div>
            <div className="text-xs text-secondary">音乐</div>
          </div>
          <div>
            <div className="text-lg font-bold text-success">{formatMinutes(totalLearning)}</div>
            <div className="text-xs text-secondary">学习</div>
          </div>
        </div>
      </div>

      {/* Recent Watch History */}
      <div className="bg-tertiary rounded-lg p-4">
        <h3 className="text-sm font-medium text-primary mb-3">最近观看</h3>
        {recentRecords.length === 0 ? (
          <p className="text-secondary text-sm py-4 text-center">暂无观看记录</p>
        ) : (
          <div className="space-y-2">
            {recentRecords.map((record) => (
              <div
                key={`${record.bvid}-${record.startedAt}`}
                className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg flex-shrink-0">{getTagEmoji(record.tag)}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-primary truncate">
                      {record.title || record.bvid}
                    </div>
                    <div className="text-xs text-secondary">
                      {record.uploader && `${record.uploader} · `}
                      {getTagLabel(record.tag)}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-sm font-medium text-primary">
                    {formatMinutes(record.totalMinutes)}
                  </div>
                  <div className="text-xs text-secondary">
                    {formatRelativeTime(record.startedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
