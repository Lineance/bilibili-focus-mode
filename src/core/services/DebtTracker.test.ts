import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DebtTracker } from './DebtTracker';

describe('DebtTracker', () => {
  let tracker: DebtTracker;
  let onDebtUpdate: ReturnType<typeof vi.fn>;
  let onBankruptcy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onDebtUpdate = vi.fn();
    onBankruptcy = vi.fn();
    tracker = new DebtTracker(2.0, -1.0, 60, onDebtUpdate, onBankruptcy);
  });

  afterEach(() => {
    tracker.destroy();
    vi.useRealTimers();
  });

  describe('startWatching', () => {
    it('should start a new watch session', () => {
      tracker.startWatching('BV1xx', 'ENTERTAINMENT', 0);
      
      expect(tracker.isWatching()).toBe(true);
      expect(tracker.getCurrentSession()).toMatchObject({
        bvid: 'BV1xx',
        tag: 'ENTERTAINMENT',
      });
    });

    it('should stop previous session before starting new one', () => {
      tracker.startWatching('BV1xx', 'ENTERTAINMENT', 0);
      const firstSession = tracker.getCurrentSession();
      
      tracker.startWatching('BV2xx', 'LEARNING', 0);
      const secondSession = tracker.getCurrentSession();
      
      expect(firstSession).not.toBe(secondSession);
      expect(secondSession?.bvid).toBe('BV2xx');
    });
  });

  describe('stopWatching', () => {
    it('should stop current session and return it', () => {
      tracker.startWatching('BV1xx', 'ENTERTAINMENT', 0);
      
      vi.advanceTimersByTime(60000); // 1 minute
      
      const session = tracker.stopWatching();
      
      expect(tracker.isWatching()).toBe(false);
      expect(session).not.toBeNull();
      expect(session?.totalWatchedMinutes).toBeGreaterThan(0);
    });

    it('should return null if not watching', () => {
      const session = tracker.stopWatching();
      expect(session).toBeNull();
    });
  });

  describe('debt calculation', () => {
    it('should accrue debt for entertainment videos', () => {
      tracker.startWatching('BV1xx', 'ENTERTAINMENT', 0);
      
      // Advance 1 minute
      vi.advanceTimersByTime(60000);
      
      expect(onDebtUpdate).toHaveBeenCalled();
      const lastCall = onDebtUpdate.mock.calls[onDebtUpdate.mock.calls.length - 1][0];
      expect(lastCall.debtChange).toBeGreaterThan(0);
      expect(lastCall.newDebt).toBeGreaterThan(0);
    });

    it('should repay debt for learning videos', () => {
      tracker.startWatching('BV1xx', 'LEARNING', 10);
      
      // Advance 1 minute
      vi.advanceTimersByTime(60000);
      
      expect(onDebtUpdate).toHaveBeenCalled();
      const lastCall = onDebtUpdate.mock.calls[onDebtUpdate.mock.calls.length - 1][0];
      expect(lastCall.debtChange).toBeLessThan(0);
      expect(lastCall.newDebt).toBeLessThan(10);
    });

    it('should not allow negative debt', () => {
      tracker.startWatching('BV1xx', 'LEARNING', 0.5);
      
      // Advance 1 minute - should repay more than available
      vi.advanceTimersByTime(60000);
      
      const lastCall = onDebtUpdate.mock.calls[onDebtUpdate.mock.calls.length - 1][0];
      expect(lastCall.newDebt).toBe(0);
    });

    it('should trigger bankruptcy when debt exceeds threshold', () => {
      tracker.startWatching('BV1xx', 'ENTERTAINMENT', 58);
      
      // Advance 2 minutes - should exceed 60 minute threshold
      vi.advanceTimersByTime(120000);
      
      expect(onBankruptcy).toHaveBeenCalled();
    });
  });

  describe('debt ratios', () => {
    it('should use entertainment ratio correctly', () => {
      tracker.startWatching('BV1xx', 'ENTERTAINMENT', 0);
      
      vi.advanceTimersByTime(60000);
      
      const lastCall = onDebtUpdate.mock.calls[onDebtUpdate.mock.calls.length - 1][0];
      // 1 minute * 2.0 ratio = 2 minutes debt change
      expect(lastCall.debtChange).toBeCloseTo(2, 1);
      expect(lastCall.entertainmentMinutes).toBeCloseTo(1, 1);
      expect(lastCall.learningMinutes).toBe(0);
    });

    it('should use learning ratio correctly', () => {
      tracker.startWatching('BV1xx', 'LEARNING', 10);
      
      vi.advanceTimersByTime(60000);
      
      const lastCall = onDebtUpdate.mock.calls[onDebtUpdate.mock.calls.length - 1][0];
      // 1 minute * -1.0 ratio = -1 minute debt change
      expect(lastCall.debtChange).toBeCloseTo(-1, 1);
      expect(lastCall.newDebt).toBeCloseTo(9, 1);
      expect(lastCall.learningMinutes).toBeCloseTo(1, 1);
      expect(lastCall.entertainmentMinutes).toBe(0);
    });
  });

  describe('watch time tracking', () => {
    it('should track entertainment watch time', () => {
      tracker.startWatching('BV1xx', 'ENTERTAINMENT', 0);
      
      vi.advanceTimersByTime(60000);
      
      const lastCall = onDebtUpdate.mock.calls[onDebtUpdate.mock.calls.length - 1][0];
      expect(lastCall.entertainmentMinutes).toBeGreaterThan(0);
      expect(lastCall.learningMinutes).toBe(0);
    });

    it('should track learning watch time', () => {
      tracker.startWatching('BV1xx', 'LEARNING', 0);
      
      vi.advanceTimersByTime(60000);
      
      const lastCall = onDebtUpdate.mock.calls[onDebtUpdate.mock.calls.length - 1][0];
      expect(lastCall.learningMinutes).toBeGreaterThan(0);
      expect(lastCall.entertainmentMinutes).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should clean up interval on destroy', () => {
      tracker.startWatching('BV1xx', 'ENTERTAINMENT', 0);
      tracker.destroy();
      
      expect(tracker.isWatching()).toBe(false);
      
      // Advance time - should not trigger any callbacks
      vi.advanceTimersByTime(60000);
      
      const callCount = onDebtUpdate.mock.calls.length;
      vi.advanceTimersByTime(60000);
      expect(onDebtUpdate.mock.calls.length).toBe(callCount);
    });
  });
});
