import { MAX_LOG_ENTRIES, MS_PER_DAY, MS_PER_HOUR, MS_PER_SECOND } from '@core/constants';
import type { BehaviorLog, BehaviorStats, TimeRange, LogFilter } from '@core/types';


export class BehaviorLoggingService {
  private readonly STORAGE_KEY = 'behaviorLogs';
  private readonly MAX_LOGS = MAX_LOG_ENTRIES;

  /**
   * Log a behavior event
   */
  async logEvent(
    action: BehaviorLog['action'],
    details?: Record<string, unknown>,
    metadata?: { bvid?: string; groupId?: string }
  ): Promise<void> {
    const log: BehaviorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      action,
      details,
      ...metadata,
    };

    const logs = await this.getAllLogs();
    logs.push(log);

    // Keep only the most recent logs
    if (logs.length > this.MAX_LOGS) {
      logs.splice(0, logs.length - this.MAX_LOGS);
    }

    await chrome.storage.local.set({ [this.STORAGE_KEY]: logs });
  }

  /**
   * Get all logs
   */
  async getAllLogs(): Promise<BehaviorLog[]> {
    const storage = await chrome.storage.local.get(this.STORAGE_KEY);
    return (storage[this.STORAGE_KEY] as BehaviorLog[]) || [];
  }

  /**
   * Get logs with filter
   */
  async getLogs(filter?: LogFilter): Promise<BehaviorLog[]> {
    let logs = await this.getAllLogs();

    if (filter) {
      if (filter.startTime !== undefined) {
        logs = logs.filter((log) => log.timestamp >= filter.startTime!);
      }
      if (filter.endTime !== undefined) {
        logs = logs.filter((log) => log.timestamp <= filter.endTime!);
      }
      if (filter.actions && filter.actions.length > 0) {
        logs = logs.filter((log) => filter.actions!.includes(log.action));
      }
      if (filter.bvid) {
        logs = logs.filter((log) => log.bvid === filter.bvid);
      }
      if (filter.groupId) {
        logs = logs.filter((log) => log.groupId === filter.groupId);
      }
      if (filter.limit) {
        logs = logs.slice(-filter.limit);
      }
    }

    return logs;
  }

  /**
   * Get behavior statistics for a time range
   */
  async getStats(timeRange: TimeRange): Promise<BehaviorStats> {
    const logs = await this.getLogs({
      startTime: timeRange.start,
      endTime: timeRange.end,
    });

    const stats: BehaviorStats = {
      totalViews: 0,
      totalWatchTimeMinutes: 0,
      videosByCategory: {},
      actionsByType: {},
      dailyBreakdown: {},
      peakHour: 0,
    };

    const hourCounts = new Array(24).fill(0);
    const watchStartTimes = new Map<string, number>();

    for (const log of logs) {
      // Count actions by type
      stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;

      // Track video starts and calculate watch time
      if (log.action === 'video_start' && log.bvid) {
        watchStartTimes.set(log.bvid, log.timestamp);
      } else if (log.action === 'video_end' && log.bvid) {
        const startTime = watchStartTimes.get(log.bvid);
        if (startTime) {
          const duration = (log.timestamp - startTime) / MS_PER_SECOND / 60; // minutes
          stats.totalWatchTimeMinutes += duration;
          watchStartTimes.delete(log.bvid);
        }
      }

      // Count views and categorize
      if (log.action === 'video_view' && log.details?.category) {
        stats.totalViews++;
        const category = log.details.category as string;
        stats.videosByCategory[category] = (stats.videosByCategory[category] || 0) + 1;
      }

      // Daily breakdown
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!stats.dailyBreakdown[date]) {
        stats.dailyBreakdown[date] = { views: 0, watchTime: 0 };
      }
      if (log.action === 'video_view') {
        stats.dailyBreakdown[date].views++;
      }

      // Track hour for peak calculation
      const hour = new Date(log.timestamp).getHours();
      hourCounts[hour]++;
    }

    // Calculate peak hour
    stats.peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    return stats;
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivity(hours: number = 24): Promise<{
    totalActions: number;
    uniqueVideos: number;
    topActions: [string, number][];
  }> {
    const cutoff = Date.now() - hours * MS_PER_HOUR;
    const logs = await this.getLogs({ startTime: cutoff });

    const uniqueVideos = new Set(logs.filter((l) => l.bvid).map((l) => l.bvid!)).size;

    const actionCounts: Record<string, number> = {};
    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    }

    const topActions = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalActions: logs.length,
      uniqueVideos,
      topActions,
    };
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    await chrome.storage.local.remove(this.STORAGE_KEY);
  }

  /**
   * Export logs as JSON
   */
  async exportLogs(): Promise<string> {
    const logs = await this.getAllLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get fuse usage statistics
   */
  async getFuseStats(days: number = 7): Promise<{
    totalApplications: number;
    successfulApplications: number;
    averageLength: number;
    byDay: Record<string, number>;
  }> {
    const cutoff = Date.now() - days * MS_PER_DAY;
    const logs = await this.getLogs({
      startTime: cutoff,
      actions: ['fuse_applied', 'fuse_verified'],
    });

    let totalLength = 0;
    let verifiedCount = 0;
    const byDay: Record<string, number> = {};

    for (const log of logs) {
      if (log.action === 'fuse_applied' && log.details?.length) {
        totalLength += typeof log.details.length === 'number' ? log.details.length : 0;
      }
      if (log.action === 'fuse_verified') {
        verifiedCount++;
      }

      const date = new Date(log.timestamp).toISOString().split('T')[0];
      byDay[date] = (byDay[date] || 0) + 1;
    }

    const applications = logs.filter((l) => l.action === 'fuse_applied').length;

    return {
      totalApplications: applications,
      successfulApplications: verifiedCount,
      averageLength: applications > 0 ? totalLength / applications : 0,
      byDay,
    };
  }

  /**
   * Get debt-related statistics
   */
  async getDebtStats(days: number = 30): Promise<{
    totalDebtIncurred: number;
    totalDebtRepaid: number;
    averageDailyDebt: number;
    bankruptcyCount: number;
  }> {
    const cutoff = Date.now() - days * MS_PER_DAY;
    const logs = await this.getLogs({
      startTime: cutoff,
      actions: ['debt_incurred', 'debt_repaid', 'bankruptcy_declared'],
    });

    let totalIncurred = 0;
    let totalRepaid = 0;
    let bankruptcyCount = 0;

    for (const log of logs) {
      if (log.action === 'debt_incurred' && log.details?.amount) {
        totalIncurred += typeof log.details.amount === 'number' ? log.details.amount : 0;
      } else if (log.action === 'debt_repaid' && log.details?.amount) {
        totalRepaid += typeof log.details.amount === 'number' ? log.details.amount : 0;
      } else if (log.action === 'bankruptcy_declared') {
        bankruptcyCount++;
      }
    }

    return {
      totalDebtIncurred: totalIncurred,
      totalDebtRepaid: totalRepaid,
      averageDailyDebt: days > 0 ? totalIncurred / days : 0,
      bankruptcyCount,
    };
  }

  private generateId(): string {
    const array = new Uint8Array(9);
    crypto.getRandomValues(array);
    return `${Date.now()}-${Array.from(array, (b) => b.toString(36)).join('')}`;
  }
}
