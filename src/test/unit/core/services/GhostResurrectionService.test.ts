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

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('招魂期已过，该视频已彻底消失');
      }
    });

    it('should fail if repentance reason too short', async () => {
      const ghost = createGhostItem();

      const result = await service.resurrect(ghost, 'some-code', 'Too short');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('忏悔理由至少需要20个字');
      }
    });

    it('should fail with wrong fuse code', async () => {
      const ghost = createGhostItem();

      const result = await service.resurrect(
        ghost,
        'WRONG-CODE-1234',
        'This is a valid repentance reason with enough characters'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('熔断码错误，请重新输入');
      }
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeDefined();
      }
    });
  });
});
