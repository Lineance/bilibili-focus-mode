import type { ExtensionConfig, FieldDescription } from '@core/types';
import { type Result, ok, failure } from '@core/types/result';
import { DEFAULT_CONFIG } from '@core/constants';
import { CONFIG_DESCRIPTIONS } from '@core/config/configDescriptions';

export type ConfigValidationError = {
  field: keyof ExtensionConfig;
  message: string;
};

export class ConfigService {
  async loadConfig(): Promise<ExtensionConfig> {
    const storage = await chrome.storage.local.get('config');
    const savedConfig = storage.config as Partial<ExtensionConfig> | undefined;
    return {
      ...DEFAULT_CONFIG,
      ...(savedConfig || {}),
    };
  }

  async saveConfig(config: ExtensionConfig): Promise<Result<ConfigValidationError[]>> {
    const errors = this.validateConfig(config);
    if (errors.length > 0) {
      return failure('VALIDATION_ERROR', '配置验证失败', errors);
    }

    await chrome.storage.local.set({ config });
    return ok();
  }

  async updateConfig(updates: Partial<ExtensionConfig>): Promise<Result<ConfigValidationError[]>> {
    const currentConfig = await this.loadConfig();
    return this.saveConfig({ ...currentConfig, ...updates });
  }

  async resetToDefaults(): Promise<void> {
    await chrome.storage.local.set({ config: { ...DEFAULT_CONFIG } });
  }

  validateConfig(config: ExtensionConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (config.maxGroups < 1 || config.maxGroups > 10) {
      errors.push({ field: 'maxGroups', message: '最大分组数应在 1-10 之间' });
    }
    if (config.maxItemsPerGroup < 1 || config.maxItemsPerGroup > 50) {
      errors.push({ field: 'maxItemsPerGroup', message: '每组最大项目数应在 1-50 之间' });
    }
    if (config.totalPermanentLimit < 1 || config.totalPermanentLimit > 500) {
      errors.push({ field: 'totalPermanentLimit', message: '永久分组总限制应在 1-500 之间' });
    }
    if (config.entertainmentRatio < 0.5 || config.entertainmentRatio > 5) {
      errors.push({ field: 'entertainmentRatio', message: '娱乐债务倍率应在 0.5-5 之间' });
    }
    if (typeof config.learningRepayRatio !== 'number' || config.learningRepayRatio < -10 || config.learningRepayRatio > 0) {
      errors.push({ field: 'learningRepayRatio', message: 'learningRepayRatio must be between -10 and 0' });
    }
    if (config.maxDebtMinutes < 10 || config.maxDebtMinutes > 300) {
      errors.push({ field: 'maxDebtMinutes', message: '破产阈值应在 10-300 分钟之间' });
    }
    if (typeof config.bankruptcyLockHours !== 'number' || config.bankruptcyLockHours < 1 || config.bankruptcyLockHours > 168) {
      errors.push({ field: 'bankruptcyLockHours', message: 'bankruptcyLockHours must be between 1 and 168' });
    }
    if (typeof config.postWatchCooldownMinutes !== 'number' || config.postWatchCooldownMinutes < 0 || config.postWatchCooldownMinutes > 60) {
      errors.push({ field: 'postWatchCooldownMinutes', message: 'postWatchCooldownMinutes must be between 0 and 60' });
    }
    if (config.dailyBypassQuota < 1 || config.dailyBypassQuota > 10) {
      errors.push({ field: 'dailyBypassQuota', message: 'dailyBypassQuota must be between 1 and 10' });
    }
    if (config.dailyBypassDurationMinutes < 5 || config.dailyBypassDurationMinutes > 120) {
      errors.push({ field: 'dailyBypassDurationMinutes', message: 'dailyBypassDurationMinutes must be between 5 and 120' });
    }
    if (config.dailyWatchLimitMinutes < 30 || config.dailyWatchLimitMinutes > 480) {
      errors.push({ field: 'dailyWatchLimitMinutes', message: 'dailyWatchLimitMinutes must be between 30 and 480' });
    }

    return errors;
  }

  getConfigDescriptions(): Record<string, FieldDescription> {
    return CONFIG_DESCRIPTIONS;
  }
}
