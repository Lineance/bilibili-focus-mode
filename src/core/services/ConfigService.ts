import type { ExtensionConfig, FieldDescription } from '@core/types';
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
  async saveConfig(config: ExtensionConfig): Promise<{ success: boolean; errors?: ConfigValidationError[] }> {
    // Validate config before saving
    const errors = this.validateConfig(config);
    
    if (errors.length > 0) {
      return {
        success: false,
        errors,
      };
    }

    await chrome.storage.local.set({ config });
    return { success: true };
  }

  /**
   * Update specific configuration fields
   */
  async updateConfig(updates: Partial<ExtensionConfig>): Promise<{ success: boolean; errors?: ConfigValidationError[] }> {
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
    if (config.baseFuseLength < 4 || config.baseFuseLength > 16) {
      errors.push({
        field: 'baseFuseLength',
        message: '基础熔断码长度应在 4-16 之间',
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
