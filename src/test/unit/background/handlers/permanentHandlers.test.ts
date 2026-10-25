import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STORAGE } from '@core/constants';
import { handleAddToPermanent } from '@background/handlers/permanentHandlers';

const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({ ...mockStorage })),
      set: vi.fn((updates: Record<string, unknown>) => {
        Object.assign(mockStorage, updates);
        return Promise.resolve();
      }),
    },
  },
});

vi.mock('@core/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('handleAddToPermanent', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    Object.assign(mockStorage, {
      ...DEFAULT_STORAGE,
      config: {
        ...DEFAULT_STORAGE.config,
        maxGroups: 4,
        maxItemsPerGroup: 10,
        totalPermanentLimit: 20,
      },
      permanentGroups: [],
    });
  });

  it('should add a tagged video to the matching permanent group', async () => {
    const result = await handleAddToPermanent({
      metadata: {
        bvid: 'BV1music',
        title: 'Music video',
        uploader: 'Uploader',
        coverUrl: '',
        tag: 'MUSIC',
        addedAt: 100,
      },
    });

    expect(result.success).toBe(true);
    expect(mockStorage.permanentGroups).toEqual([
      expect.objectContaining({
        id: 'music',
        name: '音乐',
        items: [expect.objectContaining({ bvid: 'BV1music', tag: 'MUSIC' })],
      }),
    ]);
  });

  it('should be idempotent for an existing video', async () => {
    mockStorage.permanentGroups = [{
      id: 'learning',
      name: '学习',
      debtPriority: 1,
      items: [{
        bvid: 'BV1same',
        title: 'Existing',
        uploader: 'Uploader',
        coverUrl: '',
        tag: 'LEARNING',
        addedAt: 100,
      }],
    }];

    const result = await handleAddToPermanent({
      metadata: {
        bvid: 'BV1same',
        title: 'Existing',
        uploader: 'Uploader',
        coverUrl: '',
        tag: 'LEARNING',
        addedAt: 200,
      },
    });

    expect(result.success).toBe(true);
    expect((mockStorage.permanentGroups as Array<{ items: unknown[] }>)[0].items).toHaveLength(1);
  });
});
