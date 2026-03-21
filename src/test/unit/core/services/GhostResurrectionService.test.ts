import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GhostResurrectionService } from '@core/services/';
import type { GhostItem, ExtensionConfig } from '@core/types';
import { DEFAULT_CONFIG } from '@core/constants';

// Mock chrome.storage
const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve(mockStorage)),
      set: vi.fn((data) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
    },
  },
});

// Mock crypto.getRandomValues
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
  },
});

describe('GhostResurrectionService', () => {
  let service: GhostResurrectionService;
  let config: ExtensionConfig;
  const now = Date.now();

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    config = {
      ...DEFAULT_CONFIG,
      ghostResurrectFuseLength: 64,
      ghostDoublePenalty: true,
    };
    service = new GhostResurrectionService(config);
  });

  const createGhostItem = (overrides: Partial<GhostItem> = {}): GhostItem => ({
    bvid: 'BV1xx',
    title: 'Test Video',
    uploader: 'Test Uploader',
    coverUrl: '',
    tag: 'ENTERTAINMENT',
    addedAt: now - 10 * 24 * 3600000, // 10 days ago
    diedAt: now - 3 * 24 * 3600000, // Died 3 days ago
    canResurrectUntil: now + 4 * 24 * 3600000, // 4 days left
    ...overrides,
  });

  describe('canResurrect', () => {
    it('should allow resurrection for valid ghost', () => {
      const ghost = createGhostItem();
      const result = service.canResurrect(ghost);

      expect(result.canResurrect).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject if resurrection period expired', () => {
      const ghost = createGhostItem({
        canResurrectUntil: now - 1000, // Expired 1 second ago
      });
      const result = service.canResurrect(ghost);

      expect(result.canResurrect).toBe(false);
      expect(result.reason).toBe('招魂期已过，该视频已彻底消失');
    });

    it('should reject if already resurrected', () => {
      const ghost = createGhostItem({
        resurrected: true,
      });
      const result = service.canResurrect(ghost);

      expect(result.canResurrect).toBe(false);
      expect(result.reason).toBe('该视频已被招魂过');
    });
  });

  describe('getResurrectionRequirements', () => {
    it('should return correct requirements', () => {
      const requirements = service.getResurrectionRequirements();

      expect(requirements.fuseLength).toBe(64);
      expect(requirements.requiresRepentance).toBe(true);
      expect(requirements.minRepentanceLength).toBe(20);
    });
  });

  describe('resurrect', () => {
    it('should fail if cannot resurrect', async () => {
      const ghost = createGhostItem({
        canResurrectUntil: now - 1000,
      });

      const result = await service.resurrect(ghost, 'some-code', 'Valid repentance reason that is long enough');

      expect(result.success).toBe(false);
      expect(result.message).toBe('招魂期已过，该视频已彻底消失');
    });

    it('should fail if repentance reason too short', async () => {
      const ghost = createGhostItem();

      const result = await service.resurrect(ghost, 'some-code', 'Too short');

      expect(result.success).toBe(false);
      expect(result.message).toBe('忏悔理由至少需要20个字');
    });

    it('should fail with wrong fuse code', async () => {
      const ghost = createGhostItem();

      const result = await service.resurrect(
        ghost,
        'WRONG-CODE-1234',
        'This is a valid repentance reason with enough characters'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('熔断码错误，请重新输入');
    });

    it('should succeed with valid inputs', async () => {
      const ghost = createGhostItem();
      const validFuseCode = 'ABCD-1234-EFGH-5678'; // Mock will generate this format

      // Mock the fuse code generation to match
      vi.spyOn(service as unknown as { fuseService: { generateFuseCode: () => string } }, 'fuseService', 'get')
        .mockReturnValue({
          generateFuseCode: () => validFuseCode,
          verifyFuseCode: (input: string, expected: string) => input === expected,
        } as never);

      const result = await service.resurrect(
        ghost,
        validFuseCode,
        'This is a valid repentance reason with enough characters'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('招魂成功');
      expect(result.coolingItem).toBeDefined();
    });
  });

  describe('getRemainingDays', () => {
    it('should calculate remaining days correctly', () => {
      const ghost = createGhostItem({
        canResurrectUntil: now + 3.5 * 24 * 3600000, // 3.5 days
      });

      const days = service.getRemainingDays(ghost);

      expect(days).toBe(4); // Ceiling of 3.5
    });

    it('should return 0 for expired ghosts', () => {
      const ghost = createGhostItem({
        canResurrectUntil: now - 1000,
      });

      const days = service.getRemainingDays(ghost);

      expect(days).toBe(0);
    });
  });

  describe('isExpired', () => {
    it('should return true for expired ghosts', () => {
      const ghost = createGhostItem({
        canResurrectUntil: now - 1000,
      });

      expect(service.isExpired(ghost)).toBe(true);
    });

    it('should return false for valid ghosts', () => {
      const ghost = createGhostItem();

      expect(service.isExpired(ghost)).toBe(false);
    });
  });

  describe('getResurrectableGhosts', () => {
    it('should return only resurrectable ghosts', async () => {
      mockStorage.ghostList = [
        createGhostItem({ bvid: 'BV1' }), // Valid
        createGhostItem({ bvid: 'BV2', resurrected: true }), // Already resurrected
        createGhostItem({ bvid: 'BV3', canResurrectUntil: now - 1000 }), // Expired
        createGhostItem({ bvid: 'BV4' }), // Valid
      ];

      const ghosts = await service.getResurrectableGhosts();

      expect(ghosts).toHaveLength(2);
      expect(ghosts.map((g) => g.bvid)).toContain('BV1');
      expect(ghosts.map((g) => g.bvid)).toContain('BV4');
    });
  });

  describe('cleanupExpiredGhosts', () => {
    it('should remove expired ghosts', async () => {
      mockStorage.ghostList = [
        createGhostItem({ bvid: 'BV1' }),
        createGhostItem({ bvid: 'BV2', canResurrectUntil: now - 1000 }),
        createGhostItem({ bvid: 'BV3', canResurrectUntil: now - 2000 }),
      ];

      const removedCount = await service.cleanupExpiredGhosts();

      expect(removedCount).toBe(2);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        ghostList: expect.arrayContaining([
          expect.objectContaining({ bvid: 'BV1' }),
        ]),
      });
    });

    it('should return 0 if no ghosts to remove', async () => {
      mockStorage.ghostList = [
        createGhostItem({ bvid: 'BV1' }),
        createGhostItem({ bvid: 'BV2' }),
      ];

      const removedCount = await service.cleanupExpiredGhosts();

      expect(removedCount).toBe(0);
    });
  });
});
