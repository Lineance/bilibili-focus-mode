import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploaderAllowlistService } from './UploaderAllowlistService';

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

describe('UploaderAllowlistService', () => {
  let service: UploaderAllowlistService;

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    vi.clearAllMocks();
    service = new UploaderAllowlistService();
  });

  describe('addUploader', () => {
    it('should add an uploader to the allowlist', async () => {
      const uploader = await service.addUploader('Test Uploader', 'LEARNING');

      expect(uploader.name).toBe('Test Uploader');
      expect(uploader.tag).toBe('LEARNING');
      expect(uploader.id).toBeDefined();
      expect(uploader.addedAt).toBeDefined();
    });

    it('should throw error if uploader already exists', async () => {
      await service.addUploader('Test Uploader', 'LEARNING');

      await expect(service.addUploader('Test Uploader', 'ENTERTAINMENT')).rejects.toThrow(
        'UP主已在白名单中'
      );
    });
  });

  describe('getAllowedUploaders', () => {
    it('should return empty array if no uploaders', async () => {
      const uploaders = await service.getAllowedUploaders();
      expect(uploaders).toEqual([]);
    });

    it('should return all uploaders', async () => {
      await service.addUploader('Uploader 1', 'LEARNING');
      await service.addUploader('Uploader 2', 'ENTERTAINMENT');

      const uploaders = await service.getAllowedUploaders();
      expect(uploaders).toHaveLength(2);
      expect(uploaders[0].name).toBe('Uploader 1');
      expect(uploaders[1].name).toBe('Uploader 2');
    });
  });

  describe('removeUploader', () => {
    it('should remove an uploader by id', async () => {
      const added = await service.addUploader('Test Uploader', 'LEARNING');
      await service.removeUploader(added.id);

      const uploaders = await service.getAllowedUploaders();
      expect(uploaders).toHaveLength(0);
    });
  });

  describe('isAllowed', () => {
    it('should return true if uploader is in allowlist', async () => {
      await service.addUploader('Allowed Uploader', 'LEARNING');

      const result = await service.isAllowed('Allowed Uploader');
      expect(result).toBe(true);
    });

    it('should return false if uploader is not in allowlist', async () => {
      const result = await service.isAllowed('Unknown Uploader');
      expect(result).toBe(false);
    });
  });

  describe('getUploaderTag', () => {
    it('should return tag if uploader is allowed', async () => {
      await service.addUploader('Test Uploader', 'LEARNING');

      const tag = await service.getUploaderTag('Test Uploader');
      expect(tag).toBe('LEARNING');
    });

    it('should return null if uploader is not allowed', async () => {
      const tag = await service.getUploaderTag('Unknown Uploader');
      expect(tag).toBeNull();
    });
  });

  describe('checkVideoAllowed', () => {
    it('should return allowed true and tag if uploader is allowed', async () => {
      await service.addUploader('Test Uploader', 'LEARNING');

      const result = await service.checkVideoAllowed({
        bvid: 'BV1xx',
        title: 'Test Video',
        uploader: 'Test Uploader',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: Date.now(),
      });

      expect(result.allowed).toBe(true);
      expect(result.tag).toBe('LEARNING');
    });

    it('should return allowed false if uploader is not allowed', async () => {
      const result = await service.checkVideoAllowed({
        bvid: 'BV1xx',
        title: 'Test Video',
        uploader: 'Unknown Uploader',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: Date.now(),
      });

      expect(result.allowed).toBe(false);
      expect(result.tag).toBeUndefined();
    });
  });

  describe('updateUploaderTag', () => {
    it('should update uploader tag', async () => {
      const added = await service.addUploader('Test Uploader', 'LEARNING');
      await service.updateUploaderTag(added.id, 'ENTERTAINMENT');

      const tag = await service.getUploaderTag('Test Uploader');
      expect(tag).toBe('ENTERTAINMENT');
    });
  });

  describe('clearAll', () => {
    it('should remove all uploaders', async () => {
      await service.addUploader('Uploader 1', 'LEARNING');
      await service.addUploader('Uploader 2', 'ENTERTAINMENT');

      await service.clearAll();

      const uploaders = await service.getAllowedUploaders();
      expect(uploaders).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    it('should return the count of uploaders', async () => {
      await service.addUploader('Uploader 1', 'LEARNING');
      await service.addUploader('Uploader 2', 'ENTERTAINMENT');

      const count = await service.getCount();
      expect(count).toBe(2);
    });
  });
});
