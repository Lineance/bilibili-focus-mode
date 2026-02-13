import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisualDecayService } from './VisualDecayService';
import type { VideoMetadata, VisualDecayState } from '@core/types';

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
    },
  },
});

describe('VisualDecayService', () => {
  let service: VisualDecayService;

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    vi.clearAllMocks();
    service = new VisualDecayService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateDecay', () => {
    it('should return FRESH for videos added today', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now,
      };

      const decay = service.calculateDecay(video);

      expect(decay.decayLevel).toBe('FRESH');
      expect(decay.opacity).toBe(1.0);
      expect(decay.saturation).toBe(1.0);
    });

    it('should return SLIGHT for videos added 3 days ago', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 3 * 24 * 60 * 60 * 1000,
      };

      const decay = service.calculateDecay(video);

      expect(decay.decayLevel).toBe('SLIGHT');
      expect(decay.opacity).toBe(0.9);
      expect(decay.saturation).toBe(0.8);
    });

    it('should return MODERATE for videos added 7 days ago', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 7 * 24 * 60 * 60 * 1000,
      };

      const decay = service.calculateDecay(video);

      expect(decay.decayLevel).toBe('MODERATE');
    });

    it('should return SEVERE for videos added 14 days ago', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 14 * 24 * 60 * 60 * 1000,
      };

      const decay = service.calculateDecay(video);

      expect(decay.decayLevel).toBe('SEVERE');
    });

    it('should return CRITICAL for videos added 21 days ago', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 21 * 24 * 60 * 60 * 1000,
      };

      const decay = service.calculateDecay(video);

      expect(decay.decayLevel).toBe('CRITICAL');
    });

    it('should calculate days until purge', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 20 * 60 * 60 * 1000, // 20 hours ago
      };

      const decay = service.calculateDecay(video, 24); // 24 hour purge threshold

      expect(decay.daysUntilPurge).toBe(1);
      expect(decay.shouldWarn).toBe(true);
    });

    it('should return null daysUntilPurge when expired', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 48 * 60 * 60 * 1000, // 48 hours ago
      };

      const decay = service.calculateDecay(video, 24); // 24 hour purge threshold

      expect(decay.daysUntilPurge).toBeNull();
      expect(decay.shouldWarn).toBe(false);
    });
  });

  describe('calculateDecayForList', () => {
    it('should calculate decay for multiple videos', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const videos: VideoMetadata[] = [
        {
          bvid: 'BV1xx',
          title: 'Fresh',
          uploader: 'Test',
          coverUrl: 'https://example.com/cover.jpg',
          tag: 'ENTERTAINMENT',
          addedAt: now,
        },
        {
          bvid: 'BV2xx',
          title: 'Old',
          uploader: 'Test',
          coverUrl: 'https://example.com/cover.jpg',
          tag: 'ENTERTAINMENT',
          addedAt: now - 7 * 24 * 60 * 60 * 1000,
        },
      ];

      const decays = service.calculateDecayForList(videos);

      expect(decays).toHaveLength(2);
      expect(decays[0].decayLevel).toBe('FRESH');
      expect(decays[1].decayLevel).toBe('MODERATE');
    });
  });

  describe('getDecayStyles', () => {
    it('should return correct styles for FRESH', () => {
      const styles = service.getDecayStyles('FRESH');

      expect(styles.filter).toBe('none');
      expect(styles.opacity).toBe(1.0);
      expect(styles.borderColor).toBeUndefined();
    });

    it('should return correct styles for CRITICAL', () => {
      const styles = service.getDecayStyles('CRITICAL');

      expect(styles.filter).toContain('grayscale');
      expect(styles.opacity).toBe(0.3);
      expect(styles.borderColor).toBe('#ef4444');
    });
  });

  describe('shouldPurge', () => {
    it('should return true for expired videos', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 48 * 60 * 60 * 1000, // 48 hours ago
      };

      expect(service.shouldPurge(video, 24)).toBe(true);
    });

    it('should return false for fresh videos', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 12 * 60 * 60 * 1000, // 12 hours ago
      };

      expect(service.shouldPurge(video, 24)).toBe(false);
    });
  });

  describe('getVideosToPurge', () => {
    it('should return only expired videos', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const videos: VideoMetadata[] = [
        {
          bvid: 'BV1xx',
          title: 'Fresh',
          uploader: 'Test',
          coverUrl: 'https://example.com/cover.jpg',
          tag: 'ENTERTAINMENT',
          addedAt: now - 12 * 60 * 60 * 1000,
        },
        {
          bvid: 'BV2xx',
          title: 'Expired',
          uploader: 'Test',
          coverUrl: 'https://example.com/cover.jpg',
          tag: 'ENTERTAINMENT',
          addedAt: now - 48 * 60 * 60 * 1000,
        },
      ];

      const toPurge = service.getVideosToPurge(videos, 24);

      expect(toPurge).toHaveLength(1);
      expect(toPurge[0].bvid).toBe('BV2xx');
    });
  });

  describe('getDecayStats', () => {
    it('should calculate decay statistics', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const videos: VideoMetadata[] = [
        {
          bvid: 'BV1xx',
          title: 'Fresh',
          uploader: 'Test',
          coverUrl: 'https://example.com/cover.jpg',
          tag: 'ENTERTAINMENT',
          addedAt: now,
        },
        {
          bvid: 'BV2xx',
          title: 'Fresh2',
          uploader: 'Test',
          coverUrl: 'https://example.com/cover.jpg',
          tag: 'ENTERTAINMENT',
          addedAt: now - 24 * 60 * 60 * 1000,
        },
        {
          bvid: 'BV3xx',
          title: 'Old',
          uploader: 'Test',
          coverUrl: 'https://example.com/cover.jpg',
          tag: 'ENTERTAINMENT',
          addedAt: now - 10 * 24 * 60 * 60 * 1000,
        },
      ];

      const stats = service.getDecayStats(videos);

      expect(stats.total).toBe(3);
      expect(stats.byLevel.FRESH).toBe(2);
      expect(stats.byLevel.MODERATE).toBe(1);
      expect(stats.averageAge).toBe(4); // (0 + 1 + 10) / 3 = 3.67, rounded to 4
    });

    it('should handle empty list', () => {
      const stats = service.getDecayStats([]);

      expect(stats.total).toBe(0);
      expect(stats.averageAge).toBe(0);
    });
  });

  describe('getWarningMessage', () => {
    it('should return null when no warning needed', () => {
      const calculation = {
        bvid: 'BV1xx',
        daysSinceAdded: 1,
        decayLevel: 'FRESH' as const,
        opacity: 1,
        saturation: 1,
        shouldWarn: false,
        daysUntilPurge: 5,
      };

      expect(service.getWarningMessage(calculation)).toBeNull();
    });

    it('should return urgent message for less than 1 day', () => {
      const calculation = {
        bvid: 'BV1xx',
        daysSinceAdded: 23,
        decayLevel: 'CRITICAL' as const,
        opacity: 0.3,
        saturation: 0.2,
        shouldWarn: true,
        daysUntilPurge: 1,
      };

      expect(service.getWarningMessage(calculation)).toContain('24小时');
    });

    it('should return expiration message when expired', () => {
      const calculation = {
        bvid: 'BV1xx',
        daysSinceAdded: 25,
        decayLevel: 'CRITICAL' as const,
        opacity: 0.3,
        saturation: 0.2,
        shouldWarn: true,
        daysUntilPurge: null,
      };

      expect(service.getWarningMessage(calculation)).toContain('过期');
    });
  });

  describe('getDecayProgress', () => {
    it('should calculate progress percentage', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 12 * 60 * 60 * 1000, // 12 hours ago
      };

      const progress = service.getDecayProgress(video, 24);

      expect(progress).toBe(50);
    });

    it('should cap at 100%', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const video: VideoMetadata = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: now - 48 * 60 * 60 * 1000, // 48 hours ago
      };

      const progress = service.getDecayProgress(video, 24);

      expect(progress).toBe(100);
    });
  });

  describe('getFreshnessLabel', () => {
    it('should return correct labels', () => {
      expect(service.getFreshnessLabel('FRESH')).toBe('新鲜');
      expect(service.getFreshnessLabel('CRITICAL')).toBe('即将过期');
    });
  });

  describe('storage operations', () => {
    it('should save and load decay state', async () => {
      const state: VisualDecayState = {
        enabled: true,
        threshold: 48,
        lastPurgeCheck: Date.now(),
      };

      await service.saveDecayState(state);
      const loaded = await service.loadDecayState();

      expect(loaded).toEqual(state);
    });

    it('should return default state when none saved', async () => {
      const loaded = await service.loadDecayState();

      expect(loaded.enabled).toBe(true);
      expect(loaded.threshold).toBe(24);
    });

    it('should toggle decay enabled', async () => {
      await service.toggleDecay(false);

      const state = await service.loadDecayState();
      expect(state.enabled).toBe(false);
    });

    it('should update threshold', async () => {
      await service.updateThreshold(48);

      const state = await service.loadDecayState();
      expect(state.threshold).toBe(48);
    });
  });

  describe('performPurgeCheck', () => {
    it('should separate purged and remaining videos', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const videos: VideoMetadata[] = [
        {
          bvid: 'BV1xx',
          title: 'Fresh',
          uploader: 'Test',
          coverUrl: 'https://example.com/cover.jpg',
          tag: 'ENTERTAINMENT',
          addedAt: now - 12 * 60 * 60 * 1000,
        },
        {
          bvid: 'BV2xx',
          title: 'Expired',
          uploader: 'Test',
          coverUrl: 'https://example.com/cover.jpg',
          tag: 'ENTERTAINMENT',
          addedAt: now - 48 * 60 * 60 * 1000,
        },
      ];

      const result = await service.performPurgeCheck(videos);

      expect(result.purged).toHaveLength(1);
      expect(result.purged[0].bvid).toBe('BV2xx');
      expect(result.remaining).toHaveLength(1);
      expect(result.remaining[0].bvid).toBe('BV1xx');
    });

    it('should update last purge check time', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      await service.performPurgeCheck([]);

      const state = await service.loadDecayState();
      expect(state.lastPurgeCheck).toBe(now);
    });
  });
});
