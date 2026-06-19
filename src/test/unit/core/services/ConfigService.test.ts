import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@core/services/';
import type { ExtensionConfig } from '@core/types';
import { DEFAULT_CONFIG } from '@core/constants';

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

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    vi.clearAllMocks();
    service = new ConfigService();
  });

  describe('loadConfig', () => {
    it('should return default config when no config saved', async () => {
      const config = await service.loadConfig();

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should merge saved config with defaults', async () => {
      mockStorage.config = {
        limboCapacity: 10,
        maxDebtMinutes: 100,
      };

      const config = await service.loadConfig();

      expect(config.limboCapacity).toBe(10);
      expect(config.maxDebtMinutes).toBe(100);
      expect(config.coolingCooldownHours).toBe(DEFAULT_CONFIG.coolingCooldownHours);
    });
  });

  describe('saveConfig', () => {
    it('should save valid config', async () => {
      const config: ExtensionConfig = { ...DEFAULT_CONFIG, limboCapacity: 8 };

      const result = await service.saveConfig(config);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ config });
    });

    it('should reject invalid config', async () => {
      const config: ExtensionConfig = { ...DEFAULT_CONFIG, limboCapacity: 100 }; // Invalid

      const result = await service.saveConfig(config);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('updateConfig', () => {
    it('should update specific fields', async () => {
      mockStorage.config = { ...DEFAULT_CONFIG };

      const result = await service.updateConfig({ limboCapacity: 7 });

      expect(result.success).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            limboCapacity: 7,
          }),
        })
      );
    });
  });

  describe('resetToDefaults', () => {
    it('should reset to default config', async () => {
      mockStorage.config = { ...DEFAULT_CONFIG, limboCapacity: 15 };

      await service.resetToDefaults();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        config: DEFAULT_CONFIG,
      });
    });
  });

  describe('validateConfig', () => {
    it('should return no errors for valid config', () => {
      const errors = service.validateConfig(DEFAULT_CONFIG);

      expect(errors).toHaveLength(0);
    });

    it('should detect invalid time format', () => {
      const config = { ...DEFAULT_CONFIG, windowStart: '25:00' };

      const errors = service.validateConfig(config);

      expect(errors).toContainEqual({
        field: 'windowStart',
        message: '时间格式无效，应为 HH:MM',
      });
    });

    it('should detect invalid capacity', () => {
      const config = { ...DEFAULT_CONFIG, limboCapacity: 0 };

      const errors = service.validateConfig(config);

      expect(errors).toContainEqual({
        field: 'limboCapacity',
        message: '待审池容量应在 1-20 之间',
      });
    });

    it('should detect invalid cooling period', () => {
      const config = { ...DEFAULT_CONFIG, coolingCooldownHours: 200 };

      const errors = service.validateConfig(config);

      expect(errors).toContainEqual({
        field: 'coolingCooldownHours',
        message: '冷静期应在 1-168 小时之间',
      });
    });

    it('should detect invalid fuse length', () => {
      const config = { ...DEFAULT_CONFIG, baseFuseLength: 2 };

      const errors = service.validateConfig(config);

      expect(errors).toContainEqual({
        field: 'baseFuseLength',
        message: '基础熔断码长度应在 8-64 之间',
      });
    });

    it('should detect invalid debt ratio', () => {
      const config = { ...DEFAULT_CONFIG, entertainmentRatio: 10 };

      const errors = service.validateConfig(config);

      expect(errors).toContainEqual({
        field: 'entertainmentRatio',
        message: '娱乐债务倍率应在 0.5-5 之间',
      });
    });

    it('should detect multiple errors', () => {
      const config = {
        ...DEFAULT_CONFIG,
        limboCapacity: 0,
        maxGroups: 100,
        baseFuseLength: 200,
      };

      const errors = service.validateConfig(config);

      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getConfigDescriptions', () => {
    it('should return descriptions for all config fields', () => {
      const descriptions = service.getConfigDescriptions();

      expect(Object.keys(descriptions).length).toBe(Object.keys(DEFAULT_CONFIG).length);
      expect(descriptions.limboCapacity).toEqual({
        label: '待审池容量',
        description: '待审池最多可容纳的视频数量',
        type: 'number',
      });
    });

    it('should include all field types', () => {
      const descriptions = service.getConfigDescriptions();

      const types = Object.values(descriptions).map((d) => d.type);
      expect(types).toContain('boolean');
      expect(types).toContain('number');
      expect(types).toContain('time');
      expect(types).not.toContain('string');
    });
  });
});
