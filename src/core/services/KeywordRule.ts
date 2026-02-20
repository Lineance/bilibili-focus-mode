import type { VideoTag } from '@core/types';

export interface KeywordRuleConfig {
  enabled: boolean;
  keywords: string[];
  tag: VideoTag;
}

export class KeywordRule {
  constructor(private config: KeywordRuleConfig) {}

  /**
   * Check if title matches any keyword
   * @param title Video title to check
   * @returns Matched tag if found, null otherwise
   */
  check(title: string): VideoTag | null {
    if (!this.config.enabled || this.config.keywords.length === 0) {
      return null;
    }

    const lowerTitle = title.toLowerCase();
    
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