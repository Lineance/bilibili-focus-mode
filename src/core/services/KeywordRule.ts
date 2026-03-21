import type { VideoTag } from '@core/types';

export interface KeywordRuleConfig {
  enabled: boolean;
  keywords: string[];
  tag: VideoTag;
  items?: Array<{
    keyword: string;
    tag: VideoTag;
  }>;
}

export class KeywordRule {
  constructor(private config: KeywordRuleConfig) {}

  /**
   * Check if title matches any keyword and return the corresponding tag
   */
  check(title: string): VideoTag | null {
    if (!this.config.enabled || this.config.keywords.length === 0) {
      return null;
    }

    const lowerTitle = title.toLowerCase();

    // 优先使用 items 配置（每个关键词独立标签）
    if (this.config.items && this.config.items.length > 0) {
      for (const item of this.config.items) {
        if (lowerTitle.includes(item.keyword.toLowerCase())) {
          return item.tag;
        }
      }
      return null;
    }

    // 向后兼容：使用旧的统一标签配置
    for (const keyword of this.config.keywords) {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        return this.config.tag;
      }
    }

    return null;
  }

  /**
   * Get current configuration
   */
  getConfig(): KeywordRuleConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<KeywordRuleConfig>): void {
    this.config = { ...this.config, ...config };
  }
}