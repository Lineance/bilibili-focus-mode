import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoolingTransitionService } from '@core/services/';
import type { CoolingItem } from '@core/types';

describe('CoolingTransitionService', () => {
  let service: CoolingTransitionService;
  const now = Date.now();

  beforeEach(() => {
    service = new CoolingTransitionService(7); // 7 days ghost lifespan
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('processTransitions', () => {
    it('should keep cooling items in waiting period', () => {
      const coolingItem: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now,
        availableAt: now + 24 * 3600000, // Available tomorrow
        expiresAt: now + 72 * 3600000,
      };

      const result = service.processTransitions([coolingItem]);

      expect(result.updatedCoolingList).toHaveLength(1);
      expect(result.newGhostList).toHaveLength(0);
      expect(result.transitions).toHaveLength(0);
    });

    it('should keep cooling items in available period', () => {
      const coolingItem: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now - 36 * 3600000, // Added 36 hours ago
        availableAt: now - 12 * 3600000, // Available 12 hours ago
        expiresAt: now + 36 * 3600000, // Expires in 36 hours
      };

      const result = service.processTransitions([coolingItem]);

      expect(result.updatedCoolingList).toHaveLength(1);
      expect(result.newGhostList).toHaveLength(0);
    });

    it('should transition expired items to ghost', () => {
      const coolingItem: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now - 100 * 3600000, // Added long ago
        availableAt: now - 76 * 3600000,
        expiresAt: now - 1000, // Expired 1 second ago
      };

      const result = service.processTransitions([coolingItem]);

      expect(result.updatedCoolingList).toHaveLength(0);
      expect(result.newGhostList).toHaveLength(1);
      expect(result.transitions).toHaveLength(1);
      expect(result.transitions[0].type).toBe('to_ghost');
      expect(result.transitions[0].newItem).toBeDefined();
      expect(result.transitions[0].newItem?.bvid).toBe('BV1xx');
    });

    it('should handle multiple items with different states', () => {
      const items: CoolingItem[] = [
        {
          bvid: 'BV1',
          title: 'Waiting',
          uploader: 'Test',
          coverUrl: '',
          tag: 'ENTERTAINMENT',
          addedAt: now,
          availableAt: now + 24 * 3600000,
          expiresAt: now + 72 * 3600000,
        },
        {
          bvid: 'BV2',
          title: 'Available',
          uploader: 'Test',
          coverUrl: '',
          tag: 'ENTERTAINMENT',
          addedAt: now - 36 * 3600000,
          availableAt: now - 12 * 3600000,
          expiresAt: now + 36 * 3600000,
        },
        {
          bvid: 'BV3',
          title: 'Expired',
          uploader: 'Test',
          coverUrl: '',
          tag: 'ENTERTAINMENT',
          addedAt: now - 100 * 3600000,
          availableAt: now - 76 * 3600000,
          expiresAt: now - 1000,
        },
      ];

      const result = service.processTransitions(items);

      expect(result.updatedCoolingList).toHaveLength(2);
      expect(result.newGhostList).toHaveLength(1);
      expect(result.transitions).toHaveLength(1);
    });
  });

  describe('state checks', () => {
    const createItem = (availableAt: number, expiresAt: number): CoolingItem => ({
      bvid: 'BV1xx',
      title: 'Test',
      uploader: 'Test',
      coverUrl: '',
      tag: 'ENTERTAINMENT',
      addedAt: now,
      availableAt,
      expiresAt,
    });

    it('should detect waiting period', () => {
      const item = createItem(now + 3600000, now + 7200000);
      expect(service.isInWaitingPeriod(item)).toBe(true);
      expect(service.isInAvailablePeriod(item)).toBe(false);
      expect(service.isExpired(item)).toBe(false);
    });

    it('should detect available period', () => {
      const item = createItem(now - 3600000, now + 3600000);
      expect(service.isInWaitingPeriod(item)).toBe(false);
      expect(service.isInAvailablePeriod(item)).toBe(true);
      expect(service.isExpired(item)).toBe(false);
    });

    it('should detect expired', () => {
      const item = createItem(now - 7200000, now - 3600000);
      expect(service.isInWaitingPeriod(item)).toBe(false);
      expect(service.isInAvailablePeriod(item)).toBe(false);
      expect(service.isExpired(item)).toBe(true);
    });
  });

  describe('time calculations', () => {
    it('should calculate time until available', () => {
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now,
        availableAt: now + 3600000, // 1 hour
        expiresAt: now + 7200000,
      };

      expect(service.getTimeUntilAvailable(item)).toBe(3600000);
    });

    it('should return 0 if already available', () => {
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now,
        availableAt: now - 3600000,
        expiresAt: now + 3600000,
      };

      expect(service.getTimeUntilAvailable(item)).toBe(0);
    });

    it('should calculate remaining available time', () => {
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now,
        availableAt: now - 3600000,
        expiresAt: now + 3600000, // 1 hour remaining
      };

      expect(service.getRemainingAvailableTime(item)).toBe(3600000);
    });
  });

  describe('visual state', () => {
    it('should return cooling state', () => {
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now,
        availableAt: now + 3600000,
        expiresAt: now + 7200000,
      };

      expect(service.getVisualState(item)).toBe('cooling');
    });

    it('should return early state', () => {
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now - 25 * 3600000,
        availableAt: now - 3600000, // Available 1 hour ago
        expiresAt: now + 47 * 3600000, // 47 hours remaining
      };

      expect(service.getVisualState(item)).toBe('early');
    });

    it('should return expiring state', () => {
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now - 60 * 3600000,
        availableAt: now - 36 * 3600000,
        expiresAt: now + 12 * 3600000, // 12 hours remaining
      };

      expect(service.getVisualState(item)).toBe('expiring');
    });

    it('should return expired state', () => {
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now,
        availableAt: now - 7200000,
        expiresAt: now - 3600000,
      };

      expect(service.getVisualState(item)).toBe('expired');
    });
  });
});
