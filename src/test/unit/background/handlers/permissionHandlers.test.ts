import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STORAGE } from '@core/constants';
import { handleCheckPermission } from '@background/handlers/permissionHandlers';

const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys?: string | string[] | null) => {
        if (keys === undefined || keys === null) return Promise.resolve({ ...mockStorage });
        if (typeof keys === 'string') return Promise.resolve({ [keys]: mockStorage[keys] });
        const result: Record<string, unknown> = {};
        for (const key of keys) result[key] = mockStorage[key];
        return Promise.resolve(result);
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

describe('handleCheckPermission daily full bypass', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    Object.assign(mockStorage, {
      ...DEFAULT_STORAGE,
      config: {
        ...DEFAULT_STORAGE.config,
        timeWindowEnabled: false,
        dailyBypassEnabled: true,
        dailyBypassQuota: 3,
        dailyBypassDurationMinutes: 30,
      },
      permanentGroups: [],
      instantList: [],
      limboList: [],
      allowedUploaders: [],
      debtAccount: {
        ...DEFAULT_STORAGE.debtAccount,
        bankruptcyEndTime: null,
      },
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00'));
  });

  it('should allow an otherwise blocked video while bypass is active', async () => {
    mockStorage.dailyBypassUntil = Date.now() + 30 * 60 * 1000;

    const result = await handleCheckPermission({
      bvid: 'BV1blocked',
      uploaderName: 'Uploader',
      title: 'Blocked video',
    });

    expect(result).toMatchObject({ allowed: true, reason: 'DAILY_BYPASS' });
  });

  it('should keep an unknown video blocked after bypass expires', async () => {
    mockStorage.dailyBypassUntil = Date.now() - 1;

    const result = await handleCheckPermission({
      bvid: 'BV1blocked',
      uploaderName: 'Uploader',
      title: 'Blocked video',
    });

    expect(result).toMatchObject({ allowed: false, reason: 'NO_PERMISSION' });
  });

  it('should not bypass an active bankruptcy lock', async () => {
    mockStorage.dailyBypassUntil = Date.now() + 30 * 60 * 1000;
    mockStorage.debtAccount = {
      ...DEFAULT_STORAGE.debtAccount,
      bankruptcyEndTime: Date.now() + 60 * 60 * 1000,
    };

    const result = await handleCheckPermission({
      bvid: 'BV1blocked',
      uploaderName: 'Uploader',
      title: 'Blocked video',
    });

    expect(result).toMatchObject({ allowed: false, reason: 'BANKRUPTCY' });
  });
});
