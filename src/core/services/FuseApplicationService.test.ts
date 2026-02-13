import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FuseApplicationService } from './FuseApplicationService';
import type { ExtensionConfig, VideoMetadata, BehaviorLogState } from '@core/types';
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

describe('FuseApplicationService', () => {
  let service: FuseApplicationService;
  let config: ExtensionConfig;
  let mockVideo: VideoMetadata;
  let mockBehaviorLog: BehaviorLogState;

  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    vi.clearAllMocks();

    config = { ...DEFAULT_CONFIG };
    service = new FuseApplicationService(config);

    mockVideo = {
      bvid: 'BV1xx',
      title: 'Test Video',
      uploader: 'Test Uploader',
      coverUrl: 'https://example.com/cover.jpg',
      tag: 'ENTERTAINMENT',
      addedAt: Date.now(),
    };

    mockBehaviorLog = {
      lastInstantApplication: 0,
      instantApplicationsToday: 0,
      lastWatchEnd: 0,
      currentCooldownUntil: null,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyForFuse', () => {
    it('should successfully apply for a fuse code', async () => {
      const result = await service.applyForFuse(mockVideo, mockBehaviorLog, false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.item.bvid).toBe('BV1xx');
        expect(result.item.fuseCode).toBeTruthy();
        expect(result.item.fuseCode.length).toBeGreaterThan(0);
        expect(result.item.usedFuse).toBe(false);
        expect(result.item.expiresAt).toBeGreaterThan(Date.now());
      }
    });

    it('should reject if already has active instant item', async () => {
      // First application
      await service.applyForFuse(mockVideo, mockBehaviorLog, false);

      // Second application should fail
      const result = await service.applyForFuse(mockVideo, mockBehaviorLog, false);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('已存在有效的即时许可');
      }
    });

    it('should increase fuse length with recent applications', async () => {
      // First application
      const result1 = await service.applyForFuse(mockVideo, mockBehaviorLog, false);
      expect(result1.success).toBe(true);

      // Update behavior log to simulate recent application
      mockBehaviorLog.lastInstantApplication = Date.now();
      mockBehaviorLog.instantApplicationsToday = 1;

      // Create new video
      const video2 = { ...mockVideo, bvid: 'BV2xx' };
      const result2 = await service.applyForFuse(video2, mockBehaviorLog, false);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        // Second fuse code should be longer or equal
        expect(result2.item.fuseCode.length).toBeGreaterThanOrEqual(result1.item.fuseCode.length);
      }
    });

    it('should use bankruptcy fuse length when in bankruptcy', async () => {
      const result = await service.applyForFuse(mockVideo, mockBehaviorLog, true, 720); // 12 hours remaining

      expect(result.success).toBe(true);
      if (result.success) {
        // Bankruptcy fuse should be longer (64 + 24 = 88 for 12 hours)
        expect(result.item.fuseCode.length).toBeGreaterThan(20);
      }
    });

    it('should update behavior log after application', async () => {
      await service.applyForFuse(mockVideo, mockBehaviorLog, false);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          behaviorLog: expect.objectContaining({
            instantApplicationsToday: 1,
            lastInstantApplication: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('verifyFuse', () => {
    it('should verify correct fuse code', async () => {
      // First apply for fuse
      const applyResult = await service.applyForFuse(mockVideo, mockBehaviorLog, false);
      expect(applyResult.success).toBe(true);

      if (applyResult.success) {
        const fuseCode = applyResult.item.fuseCode;

        // Verify the fuse code
        const verifyResult = await service.verifyFuse('BV1xx', fuseCode);

        expect(verifyResult.success).toBe(true);
        expect(verifyResult.message).toBe('熔断码验证成功，可以观看视频');
      }
    });

    it('should reject incorrect fuse code', async () => {
      // First apply for fuse
      await service.applyForFuse(mockVideo, mockBehaviorLog, false);

      // Try to verify with wrong code
      const verifyResult = await service.verifyFuse('BV1xx', 'WRONG-CODE');

      expect(verifyResult.success).toBe(false);
      expect(verifyResult.message).toBe('熔断码错误，请重新输入');
    });

    it('should reject if no instant item exists', async () => {
      const result = await service.verifyFuse('BV1xx', 'SOME-CODE');

      expect(result.success).toBe(false);
      expect(result.message).toBe('未找到该视频的即时许可申请');
    });

    it('should reject if fuse code already used', async () => {
      // Apply and verify once
      const applyResult = await service.applyForFuse(mockVideo, mockBehaviorLog, false);
      expect(applyResult.success).toBe(true);

      if (applyResult.success) {
        const fuseCode = applyResult.item.fuseCode;
        await service.verifyFuse('BV1xx', fuseCode);

        // Try to verify again
        const secondVerify = await service.verifyFuse('BV1xx', fuseCode);

        expect(secondVerify.success).toBe(false);
        expect(secondVerify.message).toBe('熔断码已被使用');
      }
    });

    it('should mark fuse as used after successful verification', async () => {
      const applyResult = await service.applyForFuse(mockVideo, mockBehaviorLog, false);
      expect(applyResult.success).toBe(true);

      if (applyResult.success) {
        const fuseCode = applyResult.item.fuseCode;
        await service.verifyFuse('BV1xx', fuseCode);

        // Check storage was updated
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            instantList: expect.arrayContaining([
              expect.objectContaining({
                bvid: 'BV1xx',
                usedFuse: true,
              }),
            ]),
          })
        );
      }
    });
  });

  describe('hasActiveInstant', () => {
    it('should return true for active instant with used fuse', async () => {
      // Apply and verify
      const applyResult = await service.applyForFuse(mockVideo, mockBehaviorLog, false);
      expect(applyResult.success).toBe(true);

      if (applyResult.success) {
        await service.verifyFuse('BV1xx', applyResult.item.fuseCode);

        const hasActive = await service.hasActiveInstant('BV1xx');
        expect(hasActive).toBe(true);
      }
    });

    it('should return false if fuse not used', async () => {
      await service.applyForFuse(mockVideo, mockBehaviorLog, false);

      const hasActive = await service.hasActiveInstant('BV1xx');
      expect(hasActive).toBe(false);
    });

    it('should return false if no instant exists', async () => {
      const hasActive = await service.hasActiveInstant('BV1xx');
      expect(hasActive).toBe(false);
    });
  });

  describe('getFuseCode', () => {
    it('should return fuse code for existing instant', async () => {
      const applyResult = await service.applyForFuse(mockVideo, mockBehaviorLog, false);
      expect(applyResult.success).toBe(true);

      if (applyResult.success) {
        const code = await service.getFuseCode('BV1xx');
        expect(code).toBe(applyResult.item.fuseCode);
      }
    });

    it('should return null if no instant exists', async () => {
      const code = await service.getFuseCode('BV1xx');
      expect(code).toBeNull();
    });
  });
});
