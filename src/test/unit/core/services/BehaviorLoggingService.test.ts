import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorLoggingService } from '@core/services/';
import type { TimeRange } from '@core/types';

// Mock chrome.storage
const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((key) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((data) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
      remove: vi.fn((key) => {
        delete mockStorage[key];
        return Promise.resolve();
      }),
    },
  },
});

describe('BehaviorLoggingService', () => {
  let service: BehaviorLoggingService;

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    vi.clearAllMocks();
    service = new BehaviorLoggingService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('logEvent', () => {
    it('should log a behavior event', async () => {
      await service.logEvent('video_view', { category: 'ENTERTAINMENT' }, { bvid: 'BV1xx' });

      const logs = await service.getAllLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('video_view');
      expect(logs[0].bvid).toBe('BV1xx');
      expect(logs[0].details).toEqual({ category: 'ENTERTAINMENT' });
    });

    it('should generate unique IDs for each log', async () => {
      await service.logEvent('video_view');
      await service.logEvent('video_view');

      const logs = await service.getAllLogs();
      expect(logs[0].id).not.toBe(logs[1].id);
    });

    it('should set timestamp for each log', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await service.logEvent('video_view');

      const logs = await service.getAllLogs();
      expect(logs[0].timestamp).toBe(now);
    });

    it('should limit maximum logs to 1000', async () => {
      // Add 1005 logs
      for (let i = 0; i < 1005; i++) {
        await service.logEvent('video_view');
      }

      const logs = await service.getAllLogs();
      expect(logs.length).toBe(1000);
    });
  });

  describe('getLogs', () => {
    it('should return all logs when no filter', async () => {
      await service.logEvent('video_view');
      await service.logEvent('fuse_applied');

      const logs = await service.getLogs();
      expect(logs).toHaveLength(2);
    });

    it('should filter by start time', async () => {
      const now = Date.now();
      vi.setSystemTime(now - 10000);
      await service.logEvent('video_view');

      vi.setSystemTime(now);
      await service.logEvent('fuse_applied');

      const logs = await service.getLogs({ startTime: now - 5000 });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('fuse_applied');
    });

    it('should filter by end time', async () => {
      const now = Date.now();
      vi.setSystemTime(now - 10000);
      await service.logEvent('video_view');

      vi.setSystemTime(now);
      await service.logEvent('fuse_applied');

      const logs = await service.getLogs({ endTime: now - 5000 });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('video_view');
    });

    it('should filter by actions', async () => {
      await service.logEvent('video_view');
      await service.logEvent('fuse_applied');
      await service.logEvent('video_end');

      const logs = await service.getLogs({ actions: ['video_view', 'video_end'] });
      expect(logs).toHaveLength(2);
      expect(logs.map((l) => l.action)).toContain('video_view');
      expect(logs.map((l) => l.action)).toContain('video_end');
    });

    it('should filter by bvid', async () => {
      await service.logEvent('video_view', undefined, { bvid: 'BV1xx' });
      await service.logEvent('video_view', undefined, { bvid: 'BV2xx' });

      const logs = await service.getLogs({ bvid: 'BV1xx' });
      expect(logs).toHaveLength(1);
      expect(logs[0].bvid).toBe('BV1xx');
    });

    it('should filter by groupId', async () => {
      await service.logEvent('group_created', undefined, { groupId: 'group1' });
      await service.logEvent('group_created', undefined, { groupId: 'group2' });

      const logs = await service.getLogs({ groupId: 'group1' });
      expect(logs).toHaveLength(1);
      expect(logs[0].groupId).toBe('group1');
    });

    it('should limit results', async () => {
      for (let i = 0; i < 10; i++) {
        await service.logEvent('video_view');
      }

      const logs = await service.getLogs({ limit: 5 });
      expect(logs).toHaveLength(5);
    });
  });

  describe('getStats', () => {
    it('should calculate total views', async () => {
      await service.logEvent('video_view', { category: 'ENTERTAINMENT' });
      await service.logEvent('video_view', { category: 'LEARNING' });
      await service.logEvent('fuse_applied');

      const timeRange: TimeRange = { start: 0, end: Date.now() + 1000 };
      const stats = await service.getStats(timeRange);

      expect(stats.totalViews).toBe(2);
    });

    it('should categorize videos', async () => {
      await service.logEvent('video_view', { category: 'ENTERTAINMENT' });
      await service.logEvent('video_view', { category: 'ENTERTAINMENT' });
      await service.logEvent('video_view', { category: 'LEARNING' });

      const timeRange: TimeRange = { start: 0, end: Date.now() + 1000 };
      const stats = await service.getStats(timeRange);

      expect(stats.videosByCategory).toEqual({
        ENTERTAINMENT: 2,
        LEARNING: 1,
      });
    });

    it('should count actions by type', async () => {
      await service.logEvent('video_view');
      await service.logEvent('video_view');
      await service.logEvent('fuse_applied');

      const timeRange: TimeRange = { start: 0, end: Date.now() + 1000 };
      const stats = await service.getStats(timeRange);

      expect(stats.actionsByType).toEqual({
        video_view: 2,
        fuse_applied: 1,
      });
    });

    it('should calculate watch time', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      await service.logEvent('video_start', undefined, { bvid: 'BV1xx' });
      
      // Move time forward by 5 minutes
      const endTime = startTime + 5 * 60 * 1000;
      vi.setSystemTime(endTime);
      
      await service.logEvent('video_end', undefined, { bvid: 'BV1xx' });

      const timeRange: TimeRange = { start: 0, end: endTime + 1000 };
      const stats = await service.getStats(timeRange);

      expect(stats.totalWatchTimeMinutes).toBe(5);
    });

    it('should provide daily breakdown', async () => {
      const today = new Date().toISOString().split('T')[0];

      await service.logEvent('video_view');

      const timeRange: TimeRange = { start: 0, end: Date.now() + 1000 };
      const stats = await service.getStats(timeRange);

      expect(stats.dailyBreakdown[today]).toBeDefined();
      expect(stats.dailyBreakdown[today].views).toBe(1);
    });

    it('should calculate peak hour', async () => {
      // Log events at hour 14
      const baseTime = new Date();
      baseTime.setHours(14, 0, 0, 0);
      vi.setSystemTime(baseTime.getTime());

      await service.logEvent('video_view');
      await service.logEvent('video_view');
      await service.logEvent('video_view');

      const timeRange: TimeRange = { start: 0, end: Date.now() + 1000 };
      const stats = await service.getStats(timeRange);

      expect(stats.peakHour).toBe(14);
    });
  });

  describe('getRecentActivity', () => {
    it('should return activity summary for last 24 hours', async () => {
      await service.logEvent('video_view', undefined, { bvid: 'BV1xx' });
      await service.logEvent('video_view', undefined, { bvid: 'BV2xx' });
      await service.logEvent('fuse_applied');

      const activity = await service.getRecentActivity();

      expect(activity.totalActions).toBe(3);
      expect(activity.uniqueVideos).toBe(2);
      expect(activity.topActions).toHaveLength(2);
      expect(activity.topActions[0][0]).toBe('video_view');
      expect(activity.topActions[0][1]).toBe(2);
    });

    it('should filter by custom hours', async () => {
      const now = Date.now();
      vi.setSystemTime(now - 25 * 60 * 60 * 1000); // 25 hours ago
      await service.logEvent('video_view');

      vi.setSystemTime(now);
      await service.logEvent('fuse_applied');

      const activity = await service.getRecentActivity(24);
      expect(activity.totalActions).toBe(1);
      expect(activity.topActions[0][0]).toBe('fuse_applied');
    });
  });

  describe('clearLogs', () => {
    it('should remove all logs', async () => {
      await service.logEvent('video_view');
      await service.logEvent('fuse_applied');

      await service.clearLogs();

      const logs = await service.getAllLogs();
      expect(logs).toHaveLength(0);
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('behaviorLogs');
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON string', async () => {
      await service.logEvent('video_view', { category: 'ENTERTAINMENT' }, { bvid: 'BV1xx' });

      const exported = await service.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].action).toBe('video_view');
    });
  });

  describe('getFuseStats', () => {
    it('should calculate fuse application statistics', async () => {
      await service.logEvent('fuse_applied', { length: 8 });
      await service.logEvent('fuse_applied', { length: 16 });
      await service.logEvent('fuse_verified');

      const stats = await service.getFuseStats();

      expect(stats.totalApplications).toBe(2);
      expect(stats.successfulApplications).toBe(1);
      expect(stats.averageLength).toBe(12);
    });

    it('should group by day', async () => {
      const today = new Date().toISOString().split('T')[0];

      await service.logEvent('fuse_applied');
      await service.logEvent('fuse_applied');

      const stats = await service.getFuseStats();

      expect(stats.byDay[today]).toBe(2);
    });
  });

  describe('getDebtStats', () => {
    it('should calculate debt statistics', async () => {
      await service.logEvent('debt_incurred', { amount: 10 });
      await service.logEvent('debt_incurred', { amount: 20 });
      await service.logEvent('debt_repaid', { amount: 5 });
      await service.logEvent('bankruptcy_declared');

      const stats = await service.getDebtStats();

      expect(stats.totalDebtIncurred).toBe(30);
      expect(stats.totalDebtRepaid).toBe(5);
      expect(stats.bankruptcyCount).toBe(1);
      expect(stats.averageDailyDebt).toBe(1); // 30 / 30 days
    });
  });
});
