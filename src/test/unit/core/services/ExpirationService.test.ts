import { ExpirationService } from '@core/services/';
import type { CoolingItem, InstantItem, GhostItem } from '@core/types';

describe('ExpirationService', () => {
  let service: ExpirationService;

  beforeEach(() => {
    service = new ExpirationService(24, 48, 6, 7);
  });

  describe('createCoolingItem', () => {
    it('should create cooling item with correct timestamps', () => {
      const before = Date.now();
      const item = service.createCoolingItem({
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: before,
      });
      const after = Date.now();

      expect(item.availableAt).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
      expect(item.availableAt).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
      expect(item.expiresAt).toBe(item.availableAt + 48 * 60 * 60 * 1000);
    });
  });

  describe('createInstantItem', () => {
    it('should create instant item with correct timestamps', () => {
      const before = Date.now();
      const item = service.createInstantItem(
        {
          bvid: 'BV1xx',
          title: 'Test',
          uploader: 'Test',
          coverUrl: '',
          tag: 'ENTERTAINMENT',
          addedAt: before,
        },
        'ABCD-1234'
      );
      const after = Date.now();

      expect(item.expiresAt).toBeGreaterThanOrEqual(before + 6 * 60 * 60 * 1000);
      expect(item.expiresAt).toBeLessThanOrEqual(after + 6 * 60 * 60 * 1000);
      expect(item.fuseCode).toBe('ABCD-1234');
      expect(item.usedFuse).toBe(false);
    });
  });

  describe('createGhostItem', () => {
    it('should create ghost item with correct timestamps', () => {
      const before = Date.now();
      const item = service.createGhostItem({
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: before,
      });
      const after = Date.now();

      expect(item.diedAt).toBeGreaterThanOrEqual(before);
      expect(item.diedAt).toBeLessThanOrEqual(after);
      expect(item.canResurrectUntil).toBe(item.diedAt + 7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('isCoolingAvailable', () => {
    it('should return false during cooling period', () => {
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: Date.now(),
        availableAt: Date.now() + 86400000,
        expiresAt: Date.now() + 259200000,
      };

      expect(service.isCoolingAvailable(item)).toBe(false);
    });

    it('should return true during available period', () => {
      const now = Date.now();
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now - 86400000,
        availableAt: now - 3600000,
        expiresAt: now + 86400000 + 3600000,
      };

      expect(service.isCoolingAvailable(item)).toBe(true);
    });

    it('should return false after expiration', () => {
      const now = Date.now();
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now - 259200000,
        availableAt: now - 172800000,
        expiresAt: now - 3600000,
      };

      expect(service.isCoolingAvailable(item)).toBe(false);
    });
  });

  describe('isInstantValid', () => {
    it('should return true for valid instant item', () => {
      const item: InstantItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        fuseCode: 'ABCD',
        usedFuse: false,
      };

      expect(service.isInstantValid(item)).toBe(true);
    });

    it('should return false for expired instant item', () => {
      const item: InstantItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: Date.now() - 7200000,
        expiresAt: Date.now() - 3600000,
        fuseCode: 'ABCD',
        usedFuse: false,
      };

      expect(service.isInstantValid(item)).toBe(false);
    });
  });

  describe('isGhostResurrectable', () => {
    it('should return true for recent ghost', () => {
      const item: GhostItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: Date.now(),
        diedAt: Date.now(),
        canResurrectUntil: Date.now() + 86400000,
      };

      expect(service.isGhostResurrectable(item)).toBe(true);
    });

    it('should return false for old ghost', () => {
      const item: GhostItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: Date.now() - 864000000,
        diedAt: Date.now() - 864000000,
        canResurrectUntil: Date.now() - 3600000,
      };

      expect(service.isGhostResurrectable(item)).toBe(false);
    });
  });

  describe('getCoolingVisualState', () => {
    it('should return cooling state during waiting period', () => {
      const now = Date.now();
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now,
        availableAt: now + 86400000,
        expiresAt: now + 259200000,
      };

      expect(service.getCoolingVisualState(item)).toBe('cooling');
    });

    it('should return early state in first half of available period', () => {
      const now = Date.now();
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now - 86400000,
        availableAt: now - 3600000,
        expiresAt: now + 86400000 + 3600000,
      };

      expect(service.getCoolingVisualState(item)).toBe('early');
    });

    it('should return expiring state in second half of available period', () => {
      const now = Date.now();
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now - 120000000,
        availableAt: now - 48000000,
        expiresAt: now + 3600000,
      };

      expect(service.getCoolingVisualState(item)).toBe('expiring');
    });

    it('should return expired state after expiration', () => {
      const now = Date.now();
      const item: CoolingItem = {
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: now - 300000000,
        availableAt: now - 200000000,
        expiresAt: now - 3600000,
      };

      expect(service.getCoolingVisualState(item)).toBe('expired');
    });
  });
});
