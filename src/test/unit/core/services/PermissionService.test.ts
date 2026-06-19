import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionService } from '@core/services/PermissionService';
import type { ExtensionStorage } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';

describe('PermissionService', () => {
  let service: PermissionService;
  let mockStorage: ExtensionStorage;

  beforeEach(() => {
    mockStorage = {
      ...DEFAULT_STORAGE,
      permanentGroups: [],
      instantList: [],
      coolingList: [],
      debtAccount: {
        ...DEFAULT_STORAGE.debtAccount,
        bankruptcyEndTime: null,
      },
    };
    service = new PermissionService(mockStorage);
  });

  describe('check', () => {
    it('should allow permanent group videos', () => {
      mockStorage = {
        ...mockStorage,
        permanentGroups: [
          {
            id: 'group1',
            name: 'Test Group',
            items: [
              {
                bvid: 'BV1xx',
                title: 'Test Video',
                uploader: 'Test Uploader',
                coverUrl: '',
                tag: 'LEARNING',
                addedAt: Date.now(),
              },
            ],
            debtPriority: 1,
          },
        ],
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV1xx');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('PERMANENT');
    });

    it('should allow valid instant items', () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      mockStorage = {
        ...mockStorage,
        instantList: [
          {
            bvid: 'BV2xx',
            title: 'Test Video',
            uploader: 'Test Uploader',
            coverUrl: '',
            tag: 'ENTERTAINMENT',
            addedAt: Date.now(),
            expiresAt: futureTime,
            fuseCode: 'ABCD-1234',
            usedFuse: false,
          },
        ],
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV2xx');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('INSTANT');
    });

    it('should deny expired instant items', () => {
      const pastTime = Date.now() - 3600000; // 1 hour ago
      mockStorage = {
        ...mockStorage,
        instantList: [
          {
            bvid: 'BV3xx',
            title: 'Test Video',
            uploader: 'Test Uploader',
            coverUrl: '',
            tag: 'ENTERTAINMENT',
            addedAt: Date.now() - 7200000,
            expiresAt: pastTime,
            fuseCode: 'ABCD-1234',
            usedFuse: false,
          },
        ],
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV3xx');

      expect(result.allowed).toBe(false);
    });

    it('should allow cooling items in available period', () => {
      const now = Date.now();
      mockStorage = {
        ...mockStorage,
        coolingList: [
          {
            bvid: 'BV4xx',
            title: 'Test Video',
            uploader: 'Test Uploader',
            coverUrl: '',
            tag: 'ENTERTAINMENT',
            addedAt: now - 86400000, // 1 day ago
            availableAt: now - 3600000, // Available 1 hour ago
            expiresAt: now + 86400000, // Expires in 1 day
          },
        ],
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV4xx');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('COOLING_AVAILABLE');
    });

    it('should deny cooling items in waiting period', () => {
      const now = Date.now();
      mockStorage = {
        ...mockStorage,
        coolingList: [
          {
            bvid: 'BV5xx',
            title: 'Test Video',
            uploader: 'Test Uploader',
            coverUrl: '',
            tag: 'ENTERTAINMENT',
            addedAt: now,
            availableAt: now + 86400000, // Available in 1 day
            expiresAt: now + 172800000, // Expires in 2 days
          },
        ],
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV5xx');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('COOLING_WAITING');
    });

    it('should deny when in bankruptcy', () => {
      const futureTime = Date.now() + 86400000; // 1 day from now
      mockStorage = {
        ...mockStorage,
        debtAccount: {
          ...mockStorage.debtAccount,
          bankruptcyEndTime: futureTime,
        },
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV6xx');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('BANKRUPTCY');
    });

    it('should allow permanent videos even when in bankruptcy', () => {
      const futureTime = Date.now() + 86400000; // 1 day from now
      mockStorage = {
        ...mockStorage,
        debtAccount: {
          ...mockStorage.debtAccount,
          bankruptcyEndTime: futureTime,
        },
        permanentGroups: [
          {
            id: 'learning',
            name: '学习',
            items: [
              {
                bvid: 'BV10xx',
                title: 'Test Video',
                uploader: 'Test Uploader',
                coverUrl: '',
                tag: 'LEARNING' as const,
                addedAt: Date.now(),
              },
            ],
            debtPriority: 1,
          },
        ],
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV10xx');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('PERMANENT');
    });

    it('should deny instant videos when in bankruptcy', () => {
      const futureTime = Date.now() + 86400000; // 1 day from now
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      mockStorage = {
        ...mockStorage,
        debtAccount: {
          ...mockStorage.debtAccount,
          bankruptcyEndTime: futureTime,
        },
        instantList: [
          {
            bvid: 'BV11xx',
            title: 'Test Video',
            uploader: 'Test Uploader',
            coverUrl: '',
            tag: 'ENTERTAINMENT' as const,
            addedAt: Date.now(),
            expiresAt: futureExpiry,
            fuseCode: 'ABCD-1234',
            usedFuse: false,
          },
        ],
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV11xx');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('BANKRUPTCY');
    });

    it('should deny cooling videos when in bankruptcy', () => {
      const futureTime = Date.now() + 86400000; // 1 day from now
      const pastTime = Date.now() - 3600000; // 1 hour ago
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      mockStorage = {
        ...mockStorage,
        debtAccount: {
          ...mockStorage.debtAccount,
          bankruptcyEndTime: futureTime,
        },
        coolingList: [
          {
            bvid: 'BV12xx',
            title: 'Test Video',
            uploader: 'Test Uploader',
            coverUrl: '',
            tag: 'ENTERTAINMENT' as const,
            addedAt: pastTime,
            availableAt: pastTime,
            expiresAt: futureExpiry,
          },
        ],
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV12xx');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('BANKRUPTCY');
    });

    it('should deny videos without permission', () => {
      const result = service.check('BV7xx');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_PERMISSION');
    });

    it('should deny video when no permission and no bypass', () => {
      const result = service.check('BV1xx');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_PERMISSION');
      expect(result.inReviewWindow).toBeDefined();
      expect(result.timeUntilWindow).toBeDefined();
    });

    it('should return correct result structure for all scenarios', () => {
      const result = service.check('BV999xx');

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('inReviewWindow');
      expect(result).toHaveProperty('timeUntilWindow');
    });

    it('should handle bankruptcy with learning videos', () => {
      const futureTime = Date.now() + 86400000;
      mockStorage = {
        ...mockStorage,
        debtAccount: {
          ...mockStorage.debtAccount,
          bankruptcyEndTime: futureTime,
        },
        config: {
          ...mockStorage.config,
          keywordRules: {
            enabled: true,
            keywords: ['tutorial'],
            tag: 'LEARNING' as const,
          },
        },
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV1xx', undefined, 'Python Tutorial');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('KEYWORD');
    });

    it('should block entertainment during bankruptcy', () => {
      const futureTime = Date.now() + 86400000;
      mockStorage = {
        ...mockStorage,
        debtAccount: {
          ...mockStorage.debtAccount,
          bankruptcyEndTime: futureTime,
        },
      };
      service = new PermissionService(mockStorage);

      const result = service.check('BV1xx');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('BANKRUPTCY');
    });
  });
});
