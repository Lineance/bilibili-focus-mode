import type { ExtensionConfig, FieldDescription } from '@core/types';
import { type Result, ok, failure } from '@core/types/result';
import { DEFAULT_CONFIG } from '@core/constants';
import { CONFIG_DESCRIPTIONS } from '@core/config/configDescriptions';

export type ConfigValidationError = {
  field: keyof ExtensionConfig;
  message: string;
};

export class ConfigService {
  /**
   * Load configuration from storage
   */
  async loadConfig(): Promise<ExtensionConfig> {
    const storage = await chrome.storage.local.get('config');
    const savedConfig = storage.config as ExtensionConfig | undefined;
    
    if (!savedConfig) {
      // Return default config if none saved
      return { ...DEFAULT_CONFIG };
    }

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_CONFIG,
      ...savedConfig,
    };
  }

  /**
   * Save configuration to storage
   */
  async saveConfig(config: ExtensionConfig): Promise<Result<ConfigValidationError[]>> {
    // Validate config before saving
    const errors = this.validateConfig(config);

    if (errors.length > 0) {
      return failure('VALIDATION_ERROR', '配置验证失败', errors);
    }

    await chrome.storage.local.set({ config });
    return ok();
  }

  /**
   * Update specific configuration fields
   */
  async updateConfig(updates: Partial<ExtensionConfig>): Promise<Result<ConfigValidationError[]>> {
    const currentConfig = await this.loadConfig();
    const newConfig = { ...currentConfig, ...updates };
    
    return this.saveConfig(newConfig);
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    await chrome.storage.local.set({ config: { ...DEFAULT_CONFIG } });
  }

  /**
   * Validate configuration values
   */
  validateConfig(config: ExtensionConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    // Validate time window
    if (config.timeWindowEnabled) {
      if (!this.isValidTimeString(config.windowStart)) {
        errors.push({
          field: 'windowStart',
          message: '时间格式无效，应为 HH:MM',
        });
      }
      if (!this.isValidTimeString(config.windowEnd)) {
        errors.push({
          field: 'windowEnd',
          message: '时间格式无效，应为 HH:MM',
        });
      }
      if (config.windowStart === config.windowEnd) {
        errors.push({
          field: 'windowEnd',
          message: 'windowStart and windowEnd cannot be the same',
        });
      }
    }

    // Validate capacities and limits
    if (config.limboCapacity < 1 || config.limboCapacity > 20) {
      errors.push({
        field: 'limboCapacity',
        message: '待审池容量应在 1-20 之间',
      });
    }

    if (config.maxGroups < 1 || config.maxGroups > 10) {
      errors.push({
        field: 'maxGroups',
        message: '最大分组数应在 1-10 之间',
      });
    }

    if (config.maxItemsPerGroup < 1 || config.maxItemsPerGroup > 50) {
      errors.push({
        field: 'maxItemsPerGroup',
        message: '每组最大项目数应在 1-50 之间',
      });
    }

    // Validate cooling periods
    if (config.coolingCooldownHours < 1 || config.coolingCooldownHours > 168) {
      errors.push({
        field: 'coolingCooldownHours',
        message: '冷静期应在 1-168 小时之间',
      });
    }

    if (config.coolingAvailableHours < 1 || config.coolingAvailableHours > 168) {
      errors.push({
        field: 'coolingAvailableHours',
        message: '可用期应在 1-168 小时之间',
      });
    }

    // Validate instant duration
    if (config.instantDurationHours < 1 || config.instantDurationHours > 24) {
      errors.push({
        field: 'instantDurationHours',
        message: '即时许可有效期应在 1-24 小时之间',
      });
    }

    // Validate fuse lengths
    if (config.baseFuseLength < 8 || config.baseFuseLength > 64) {
      errors.push({
        field: 'baseFuseLength',
        message: '基础熔断码长度应在 8-64 之间',
      });
    }

    if (config.maxFuseLength < config.baseFuseLength || config.maxFuseLength > 128) {
      errors.push({
        field: 'maxFuseLength',
        message: '最大熔断码长度应在基础长度到 128 之间',
      });
    }

    // Validate debt settings
    if (config.entertainmentRatio < 0.5 || config.entertainmentRatio > 5) {
      errors.push({
        field: 'entertainmentRatio',
        message: '娱乐债务倍率应在 0.5-5 之间',
      });
    }

    if (config.maxDebtMinutes < 10 || config.maxDebtMinutes > 300) {
      errors.push({
        field: 'maxDebtMinutes',
        message: '破产阈值应在 10-300 分钟之间',
      });
    }

    // Validate ghost settings
    if (config.ghostLifespanDays < 1 || config.ghostLifespanDays > 30) {
      errors.push({
        field: 'ghostLifespanDays',
        message: '幽灵寿命应在 1-30 天之间',
      });
    }

    if (typeof config.learningRepayRatio !== 'number' || config.learningRepayRatio < -10 || config.learningRepayRatio > 0) {
      errors.push({
        field: 'learningRepayRatio',
        message: 'learningRepayRatio must be between -10 and 0',
      });
    }

    if (typeof config.bankruptcyLockHours !== 'number' || config.bankruptcyLockHours < 1 || config.bankruptcyLockHours > 168) {
      errors.push({
        field: 'bankruptcyLockHours',
        message: 'bankruptcyLockHours must be between 1 and 168',
      });
    }

    if (typeof config.bankruptcyOverrideMaxFuse !== 'number' || config.bankruptcyOverrideMaxFuse < 8 || config.bankruptcyOverrideMaxFuse > 256) {
      errors.push({
        field: 'bankruptcyOverrideMaxFuse',
        message: 'bankruptcyOverrideMaxFuse must be between 8 and 256',
      });
    }

    if (typeof config.dailyCoolingQuota !== 'number' || config.dailyCoolingQuota < 0 || config.dailyCoolingQuota > 100) {
      errors.push({
        field: 'dailyCoolingQuota',
        message: 'dailyCoolingQuota must be between 0 and 100',
      });
    }

    if (typeof config.dailyInstantQuota !== 'number' || config.dailyInstantQuota < 0 || config.dailyInstantQuota > 100) {
      errors.push({
        field: 'dailyInstantQuota',
        message: 'dailyInstantQuota must be between 0 and 100',
      });
    }

    if (typeof config.postWatchCooldownMinutes !== 'number' || config.postWatchCooldownMinutes < 0 || config.postWatchCooldownMinutes > 60) {
      errors.push({
        field: 'postWatchCooldownMinutes',
        message: 'postWatchCooldownMinutes must be between 0 and 60',
      });
    }

    if (typeof config.ghostResurrectFuseLength !== 'number' || config.ghostResurrectFuseLength < 8 || config.ghostResurrectFuseLength > 256) {
      errors.push({
        field: 'ghostResurrectFuseLength',
        message: 'ghostResurrectFuseLength must be between 8 and 256',
      });
    }

    // Daily Bypass validation
    if (config.dailyBypassQuota !== undefined) {
      if (config.dailyBypassQuota < 1 || config.dailyBypassQuota > 10) {
        errors.push({ field: 'dailyBypassQuota', message: 'dailyBypassQuota must be between 1 and 10' });
      }
    }

    if (config.dailyBypassDurationMinutes !== undefined) {
      if (config.dailyBypassDurationMinutes < 5 || config.dailyBypassDurationMinutes > 120) {
        errors.push({ field: 'dailyBypassDurationMinutes', message: 'dailyBypassDurationMinutes must be between 5 and 120' });
      }
    }

    return errors;
  }

  /**
   * Get configuration description for UI
   */
  getConfigDescriptions(): Record<string, FieldDescription> {
    return CONFIG_DESCRIPTIONS;
  }

  private isValidTimeString(time: string): boolean {
    const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(time);
  }
}
