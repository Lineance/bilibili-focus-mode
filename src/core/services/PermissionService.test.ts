import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionService } from './PermissionService';
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

    it('should deny videos without permission', () => {
      const result = service.check('BV7xx');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_PERMISSION');
    });
  });

  describe('isInLimbo', () => {
    it('should return true for videos in limbo', () => {
      mockStorage = {
        ...mockStorage,
        limboList: [
          {
            bvid: 'BV8xx',
            title: 'Test Video',
            uploader: 'Test Uploader',
            coverUrl: '',
            tag: 'ENTERTAINMENT',
            addedAt: Date.now(),
            sourceUrl: 'https://bilibili.com/video/BV8xx',
          },
        ],
      };
      service = new PermissionService(mockStorage);

      expect(service.isInLimbo('BV8xx')).toBe(true);
      expect(service.isInLimbo('BV9xx')).toBe(false);
    });
  });

  describe('isInGhost', () => {
    it('should return true for videos in ghost list', () => {
      const futureTime = Date.now() + 86400000;
      mockStorage = {
        ...mockStorage,
        ghostList: [
          {
            bvid: 'BV10x',
            title: 'Test Video',
            uploader: 'Test Uploader',
            coverUrl: '',
            tag: 'ENTERTAINMENT',
            addedAt: Date.now(),
            diedAt: Date.now(),
            canResurrectUntil: futureTime,
          },
        ],
      };
      service = new PermissionService(mockStorage);

      expect(service.isInGhost('BV10x')).toBe(true);
      expect(service.isInGhost('BV11x')).toBe(false);
    });
  });
});
