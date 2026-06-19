import { describe, it, expect, beforeEach } from 'vitest';
import { TimeWindowService } from '@core/services/';
import type { ExtensionConfig } from '@core/types';
import { DEFAULT_CONFIG } from '@core/constants';

describe('TimeWindowService', () => {
  let service: TimeWindowService;
  let config: ExtensionConfig;

  beforeEach(() => {
    config = {
      ...DEFAULT_CONFIG,
      timeWindowEnabled: true,
      windowStart: '20:00',
      windowEnd: '21:00',
    };
    service = new TimeWindowService(config);
  });

  describe('checkTimeWindow', () => {
    it('should return in window when time window is disabled', () => {
      config.timeWindowEnabled = false;
      service = new TimeWindowService(config);

      const status = service.checkTimeWindow();

      expect(status.isInWindow).toBe(true);
      expect(status.timeUntilWindow).toBe(0);
    });

    it('should detect when currently in window', () => {
      // Mock current time to 20:30 (in window)
      const mockNow = new Date();
      mockNow.setHours(20, 30, 0, 0);
      vi.setSystemTime(mockNow);

      const status = service.checkTimeWindow();

      expect(status.isInWindow).toBe(true);
      expect(status.timeRemainingInWindow).toBeGreaterThan(0);
      expect(status.timeUntilWindow).toBe(0);
    });

    it('should detect when outside window (before start)', () => {
      // Mock current time to 19:00 (before window)
      const mockNow = new Date();
      mockNow.setHours(19, 0, 0, 0);
      vi.setSystemTime(mockNow);

      const status = service.checkTimeWindow();

      expect(status.isInWindow).toBe(false);
      expect(status.timeUntilWindow).toBeGreaterThan(0);
      expect(status.timeRemainingInWindow).toBe(0);
    });

    it('should detect when outside window (after end)', () => {
      // Mock current time to 22:00 (after window)
      const mockNow = new Date();
      mockNow.setHours(22, 0, 0, 0);
      vi.setSystemTime(mockNow);

      const status = service.checkTimeWindow();

      expect(status.isInWindow).toBe(false);
      expect(status.timeUntilWindow).toBeGreaterThan(0);
      expect(status.windowStart.getDate()).toBe(mockNow.getDate() + 1);
    });

    it('should handle overnight window', () => {
      config.windowStart = '23:00';
      config.windowEnd = '01:00';
      service = new TimeWindowService(config);

      // At 00:30 (in overnight window)
      const mockNow = new Date();
      mockNow.setHours(0, 30, 0, 0);
      vi.setSystemTime(mockNow);

      const status = service.checkTimeWindow();

      expect(status.isInWindow).toBe(true);
    });
  });

  describe('canBreakWindow', () => {
    it('should return true when instantBreakFuse is enabled', () => {
      config.instantBreakFuse = true;
      service = new TimeWindowService(config);

      expect(service.canBreakWindow()).toBe(true);
    });

    it('should return false when instantBreakFuse is disabled', () => {
      config.instantBreakFuse = false;
      service = new TimeWindowService(config);

      expect(service.canBreakWindow()).toBe(false);
    });
  });
});
