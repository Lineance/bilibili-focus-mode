import type { ExtensionConfig } from '@core/types';
import { DEFAULT_CONFIG } from '@core/constants';

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
  getConfigDescriptions(): Record<string, { label: string; description: string; type: 'boolean' | 'number' | 'string' | 'time' }> {
    return {
      timeWindowEnabled: {
        label: '启用时间窗口',
        description: '限制只能在特定时间段观看视频',
        type: 'boolean',
      },
      windowStart: {
        label: '窗口开始时间',
        description: '允许观看的开始时间（如 20:00）',
        type: 'time',
      },
      windowEnd: {
        label: '窗口结束时间',
        description: '允许观看的结束时间（如 21:00）',
        type: 'time',
      },
      limboCapacity: {
        label: '待审池容量',
        description: '待审池最多可容纳的视频数量',
        type: 'number',
      },
      limboReviewTime: {
        label: '待审提醒时间',
        description: '每日提醒审查待审池的时间',
        type: 'time',
      },
      limboAutoPurgeHours: {
        label: '待审自动清理时间',
        description: '待审池视频自动清理的时间（小时）',
        type: 'number',
      },
      coolingCooldownHours: {
        label: '冷静期时长',
        description: '冷却期的等待时长（小时）',
        type: 'number',
      },
      coolingAvailableHours: {
        label: '可用期时长',
        description: '冷却期后可供观看的时长（小时）',
        type: 'number',
      },
      instantDurationHours: {
        label: '即时许可有效期',
        description: '即时许可的有效时长（小时）',
        type: 'number',
      },
      instantBreakFuse: {
        label: '允许熔断码打破时段',
        description: '是否允许使用熔断码在非窗口时段观看',
        type: 'boolean',
      },
      baseFuseLength: {
        label: '基础熔断码长度',
        description: '熔断码的基础字符长度',
        type: 'number',
      },
      maxFuseLength: {
        label: '最大熔断码长度',
        description: '熔断码的最大字符长度',
        type: 'number',
      },
      maxGroups: {
        label: '最大分组数',
        description: '永久分组的最大数量',
        type: 'number',
      },
      maxItemsPerGroup: {
        label: '每组最大项目数',
        description: '每个永久分组最多可容纳的视频数',
        type: 'number',
      },
      totalPermanentLimit: {
        label: '永久分组总限制',
        description: '所有永久分组的视频总数限制',
        type: 'number',
      },
      ghostLifespanDays: {
        label: '幽灵寿命',
        description: '幽灵档案可招魂的天数',
        type: 'number',
      },
      ghostResurrectFuseLength: {
        label: '招魂熔断码长度',
        description: '招魂所需的熔断码长度',
        type: 'number',
      },
      ghostDoublePenalty: {
        label: '招魂双倍惩罚',
        description: '招魂后是否应用双倍冷静期',
        type: 'boolean',
      },
      debtEnabled: {
        label: '启用债务系统',
        description: '是否启用债务追踪功能',
        type: 'boolean',
      },
      entertainmentRatio: {
        label: '娱乐债务倍率',
        description: '观看娱乐视频产生的债务倍率',
        type: 'number',
      },
      learningRepayRatio: {
        label: '学习偿还倍率',
        description: '观看学习视频偿还债务的倍率（负数）',
        type: 'number',
      },
      maxDebtMinutes: {
        label: '破产阈值',
        description: '触发破产的债务阈值（分钟）',
        type: 'number',
      },
      bankruptcyLockHours: {
        label: '破产锁定时长',
        description: '破产后锁定的时长（小时）',
        type: 'number',
      },
      bankruptcyOverrideMaxFuse: {
        label: '破产熔断码最大长度',
        description: '破产时熔断码的最大长度',
        type: 'number',
      },
      dynamicFuseEnabled: {
        label: '启用动态熔断码',
        description: '根据申请频率动态调整熔断码长度',
        type: 'boolean',
      },
      postWatchCooldownMinutes: {
        label: '观看后冷静期',
        description: '观看后的冷静期时长（分钟）',
        type: 'number',
      },
      dailyCoolingQuota: {
        label: '每日冷却配额',
        description: '每日可申请冷却的最大次数（0=无限制）',
        type: 'number',
      },
      dailyInstantQuota: {
        label: '每日即时配额',
        description: '每日可申请即时许可的最大次数（0=无限制）',
        type: 'number',
      },
      collectionDetectionEnabled: {
        label: '启用合集检测',
        description: '自动检测并处理合集视频',
        type: 'boolean',
      },
      videoPlayerSimplification: {
        label: '视频播放页样式简化',
        description: '简化视频播放页布局，减少干扰元素',
        type: 'boolean',
      },
      homepageSimplification: {
        label: '首页样式简化',
        description: '简化首页布局，减少干扰元素',
        type: 'boolean',
      },
      dynamicSimplification: {
        label: '动态页样式简化',
        description: '简化动态页布局，仅显示关注内容',
        type: 'boolean',
      },
      liveSimplification: {
        label: '直播页样式简化',
        description: '简化直播页面布局，减少干扰元素',
        type: 'boolean',
      },
    };
  }

  private isValidTimeString(time: string): boolean {
    const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(time);
  }
}
