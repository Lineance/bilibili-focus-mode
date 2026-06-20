import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleDailyBypass } from '@background/handlers/bypassHandlers';
import { DEFAULT_STORAGE, DEFAULT_BEHAVIOR_LOG } from '@core/constants';

const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys?: string | string[] | null) => {
        if (keys === undefined || keys === null) {
          return Promise.resolve(mockStorage);
        }
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorage[keys] });
        }
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          result[key] = mockStorage[key];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage, data);
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

describe('handleDailyBypass', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);

    Object.assign(mockStorage, {
      ...DEFAULT_STORAGE,
      config: {
        ...DEFAULT_STORAGE.config,
        dailyBypassEnabled: true,
        dailyBypassQuota: 3,
        dailyBypassDurationMinutes: 30,
      },
      behaviorLog: {
        ...DEFAULT_BEHAVIOR_LOG,
        dailyBypassesUsedToday: 0,
      },
    });

    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00'));
  });

  it('should return error when feature is disabled', async () => {
    mockStorage.config = {
      ...(mockStorage.config as Record<string, unknown>),
      dailyBypassEnabled: false,
    };

    const result = await handleDailyBypass();

    expect(result.success).toBe(false);
    expect(result.message).toBe('每日放行功能未启用');
  });

  it('should return error when bypass is already active', async () => {
    const futureTime = Date.now() + 60000;
    mockStorage.dailyBypassUntil = futureTime;

    const result = await handleDailyBypass();

    expect(result.success).toBe(false);
    expect(result.message).toBe('当前已有生效的放行');
    expect(result.expiresAt).toBe(futureTime);
  });

  it('should return error when daily quota is exceeded', async () => {
    mockStorage.behaviorLog = {
      ...DEFAULT_BEHAVIOR_LOG,
      dailyBypassesUsedToday: 3,
      lastQuotaResetDate: '2026-01-15',
    };

    const result = await handleDailyBypass();

    expect(result.success).toBe(false);
    expect(result.message).toContain('今日放行次数已用完');
  });

  it('should successfully activate bypass', async () => {
    const result = await handleDailyBypass();

    expect(result.success).toBe(true);
    expect(result.message).toContain('已放行 30 分钟');
    expect(result.message).toContain('今日剩余 2 次');
    expect(result.expiresAt).toBe(Date.now() + 30 * 60 * 1000);
  });

  it('should increment daily bypass counter', async () => {
    await handleDailyBypass();

    const updatedLog = mockStorage.behaviorLog as Record<string, unknown>;
    expect(updatedLog.dailyBypassesUsedToday).toBe(1);
  });

  it('should set dailyBypassUntil in storage', async () => {
    await handleDailyBypass();

    const expectedExpiry = Date.now() + 30 * 60 * 1000;
    expect(mockStorage.dailyBypassUntil).toBe(expectedExpiry);
  });

  it('should use configured duration', async () => {
    mockStorage.config = {
      ...(mockStorage.config as Record<string, unknown>),
      dailyBypassDurationMinutes: 60,
    };

    const result = await handleDailyBypass();

    expect(result.success).toBe(true);
    expect(result.expiresAt).toBe(Date.now() + 60 * 60 * 1000);
  });

  it('should reset counter on new day', async () => {
    mockStorage.behaviorLog = {
      ...DEFAULT_BEHAVIOR_LOG,
      dailyBypassesUsedToday: 3,
      lastQuotaResetDate: '2026-01-14',
    };

    const result = await handleDailyBypass();

    expect(result.success).toBe(true);
    expect(result.message).toContain('今日剩余 2 次');
  });

  it('should handle multiple bypasses in same day', async () => {
    const result1 = await handleDailyBypass();
    expect(result1.success).toBe(true);
    expect(result1.message).toContain('今日剩余 2 次');

    delete mockStorage.dailyBypassUntil;

    const result2 = await handleDailyBypass();
    expect(result2.success).toBe(true);
    expect(result2.message).toContain('今日剩余 1 次');

    delete mockStorage.dailyBypassUntil;

    const result3 = await handleDailyBypass();
    expect(result3.success).toBe(true);
    expect(result3.message).toContain('今日剩余 0 次');

    delete mockStorage.dailyBypassUntil;

    const result4 = await handleDailyBypass();
    expect(result4.success).toBe(false);
    expect(result4.message).toContain('今日放行次数已用完');
  });
});
