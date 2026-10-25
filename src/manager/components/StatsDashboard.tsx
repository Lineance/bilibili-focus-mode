import { MS_PER_MINUTE } from '@core/constants';
import React, { useMemo, useState } from 'react';
import type { ExtensionConfig, WatchRecord } from '@core/types';
import { useNow } from '@hooks/useNow';
import { Card, EmptyState, Icon, Progress, SectionHeader, StatusChip, TagChip } from '@ui';

type TimeRange = 'day' | 'week' | 'month';

function formatMinutes(m: number): string {
  if (m < 1) return '不到 1 分钟';
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  if (h === 0) return `${min} 分钟`;
  if (min === 0) return `${h} 小时`;
  return `${h} 小时 ${min} 分`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

const RANGE_LABEL: Record<TimeRange, string> = { day: '今日', week: '本周', month: '本月' };

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
  useNow(MS_PER_MINUTE);
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

  const stats = useMemo(() => {
    let entertainment = 0;
    let learning = 0;
    let music = 0;
    for (const record of watchHistory) {
      if (record.startedAt < rangeStart) continue;
      switch (record.tag) {
        case 'LEARNING': learning += record.totalMinutes; break;
        case 'MUSIC': music += record.totalMinutes; break;
        default: entertainment += record.totalMinutes; break;
      }
    }
    return { entertainment, learning, music, total: entertainment + learning + music };
  }, [watchHistory, rangeStart]);

  const watchLimit = config.dailyWatchLimitMinutes || 180;
  const usagePercent = Math.min(100, Math.round((stats.total / watchLimit) * 100));
  const usageTone = usagePercent >= 90 ? 'error' : usagePercent >= 70 ? 'warning' : 'success';

  const recentRecords = useMemo(
    () => [...watchHistory].sort((a, b) => b.startedAt - a.startedAt).slice(0, 20),
    [watchHistory]
  );

  const totalEntertainment = account?.totalEntertainmentMinutes ?? 0;
  const totalLearning = account?.totalLearningMinutes ?? 0;
  const totalMusic = account?.totalMusicMinutes ?? 0;

  return (
    <div>
      <SectionHeader
        title="屏幕使用时间"
        icon="chart"
        description="按标签统计观看时长；娱乐产生债务，学习偿还债务，音乐不计入。"
        actions={
          <div className="flex gap-1 rounded-full border border-secondary p-1">
            {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                  timeRange === range
                    ? 'bg-accent text-on-accent font-medium'
                    : 'text-tertiary hover:text-primary'
                }`}
              >
                {RANGE_LABEL[range]}
              </button>
            ))}
          </div>
        }
      />

      <Card className="mb-5">
        <div className="grid gap-6 md:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="fm-label">{RANGE_LABEL[timeRange]}观看</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="fm-stat__value">{formatMinutes(stats.total)}</span>
              <span className="text-[12px] text-tertiary">/ {formatMinutes(watchLimit)} 限额</span>
            </div>
            <div className="mt-4">
              <Progress value={stats.total} max={watchLimit} tone={usageTone} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StatusChip tone={usageTone === 'success' ? 'success' : usageTone === 'warning' ? 'warning' : 'error'} icon={usagePercent >= 70 ? 'alert' : 'check'}>
                {usagePercent}%
              </StatusChip>
              <span className="text-[12px] text-tertiary">
                {usagePercent >= 90
                  ? '已接近今日观看限额'
                  : usagePercent >= 70
                    ? '观看时间较多，注意休息'
                    : '观看时间健康'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl bg-tertiary p-4">
            {[
              { label: '娱乐', value: stats.entertainment, tone: 'var(--fm-warning)', icon: 'gamepad' as const },
              { label: '音乐', value: stats.music, tone: 'var(--fm-info)', icon: 'music' as const },
              { label: '学习', value: stats.learning, tone: 'var(--fm-success)', icon: 'book' as const },
            ].map((item) => (
              <div key={item.label}>
                <span style={{ color: item.tone }}>
                  <Icon name={item.icon} size={16} />
                </span>
                <p className="mt-2 font-mono text-[17px] font-semibold tabular-nums">{Math.round(item.value)}</p>
                <p className="mt-0.5 text-[11px] text-tertiary">{item.label} / 分钟</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: '娱乐累计', value: totalEntertainment, color: 'var(--fm-warning)', icon: 'gamepad' as const },
          { label: '音乐累计', value: totalMusic, color: 'var(--fm-info)', icon: 'music' as const },
          { label: '学习累计', value: totalLearning, color: 'var(--fm-success)', icon: 'book' as const },
        ].map((item) => (
          <Card key={item.label}>
            <div className="flex items-center gap-2" style={{ color: item.color }}>
              <Icon name={item.icon} size={15} />
              <span className="text-[12px] font-medium">{item.label}</span>
            </div>
            <p className="fm-stat__value mt-2 text-[22px]">{formatMinutes(item.value)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="fm-section-title mb-0">最近观看</h3>
          <span className="fm-label">最近 20 条</span>
        </div>

        {recentRecords.length === 0 ? (
          <EmptyState icon="history" title="暂无观看记录" description="开始观看并通过审批后，这里会出现记录。" />
        ) : (
          <div className="grid gap-2">
            {recentRecords.map((record) => (
              <div
                key={`${record.bvid}-${record.startedAt}`}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-tertiary"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <TagChip tag={record.tag} showIcon={false} />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-primary">{record.title || record.bvid}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {record.uploader ? `${record.uploader} · ` : ''}
                      {formatRelativeTime(record.startedAt)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-secondary">
                  {formatMinutes(record.totalMinutes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
