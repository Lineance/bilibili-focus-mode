import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@core/services';
import type { ExtensionConfig } from '@core/types';
import { DEFAULT_CONFIG } from '@core/constants';

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

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
    service = new ConfigService();
  });

  it('should return default config when no config is saved', async () => {
    expect(await service.loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('should merge saved config with defaults', async () => {
    mockStorage.config = { maxDebtMinutes: 100 };

    const config = await service.loadConfig();

    expect(config.maxDebtMinutes).toBe(100);
    expect(config.dailyBypassQuota).toBe(DEFAULT_CONFIG.dailyBypassQuota);
  });

  it('should save valid config', async () => {
    const config: ExtensionConfig = { ...DEFAULT_CONFIG, totalPermanentLimit: 30 };

    const result = await service.saveConfig(config);

    expect(result.ok).toBe(true);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ config });
  });

  it('should reject invalid permanent limits', async () => {
    const config: ExtensionConfig = { ...DEFAULT_CONFIG, totalPermanentLimit: 0 };

    const result = await service.saveConfig(config);

    expect(result.ok).toBe(false);
  });

  it('should update specific fields', async () => {
    mockStorage.config = { ...DEFAULT_CONFIG };

    const result = await service.updateConfig({ maxDebtMinutes: 100 });

    expect(result.ok).toBe(true);
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ maxDebtMinutes: 100 }) })
    );
  });

  it('should reset to defaults', async () => {
    await service.resetToDefaults();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ config: DEFAULT_CONFIG });
  });

  it('should validate debt and bypass settings', () => {
    const errors = service.validateConfig({
      ...DEFAULT_CONFIG,
      entertainmentRatio: 10,
      dailyBypassQuota: 0,
    });

    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'entertainmentRatio' }),
      expect.objectContaining({ field: 'dailyBypassQuota' }),
    ]));
  });

  it('should expose descriptions for retained settings', () => {
    const descriptions = service.getConfigDescriptions();

    expect(descriptions.maxDebtMinutes).toBeDefined();
    expect(descriptions.dailyBypassQuota).toBeDefined();
    expect(descriptions.videoPlayerSimplification).toBeDefined();
    expect(descriptions.limboCapacity).toBeUndefined();
  });
});
