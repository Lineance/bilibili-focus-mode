import type { VideoMetadata, VisualDecayState, DecayLevel } from '@core/types';

export interface DecayCalculation {
  bvid: string;
  daysSinceAdded: number;
  decayLevel: DecayLevel;
  opacity: number;
  saturation: number;
  shouldWarn: boolean;
  daysUntilPurge: number | null;
}

export class VisualDecayService {
  private readonly DECAY_THRESHOLDS = {
    FRESH: { days: 0, opacity: 1.0, saturation: 1.0 },
    SLIGHT: { days: 3, opacity: 0.9, saturation: 0.8 },
    MODERATE: { days: 7, opacity: 0.7, saturation: 0.6 },
    SEVERE: { days: 14, opacity: 0.5, saturation: 0.4 },
    CRITICAL: { days: 21, opacity: 0.3, saturation: 0.2 },
  };



  /**
   * Calculate visual decay for a video
   */
  calculateDecay(
    video: VideoMetadata,
    autoPurgeHours: number = 24
  ): DecayCalculation {
    const now = Date.now();
    const daysSinceAdded = (now - video.addedAt) / (1000 * 60 * 60 * 24);
    const autoPurgeDays = autoPurgeHours / 24;

    let decayLevel: DecayLevel;
    let opacity: number;
    let saturation: number;

    if (daysSinceAdded >= this.DECAY_THRESHOLDS.CRITICAL.days) {
      decayLevel = 'CRITICAL';
      opacity = this.DECAY_THRESHOLDS.CRITICAL.opacity;
      saturation = this.DECAY_THRESHOLDS.CRITICAL.saturation;
    } else if (daysSinceAdded >= this.DECAY_THRESHOLDS.SEVERE.days) {
      decayLevel = 'SEVERE';
      opacity = this.DECAY_THRESHOLDS.SEVERE.opacity;
      saturation = this.DECAY_THRESHOLDS.SEVERE.saturation;
    } else if (daysSinceAdded >= this.DECAY_THRESHOLDS.MODERATE.days) {
      decayLevel = 'MODERATE';
      opacity = this.DECAY_THRESHOLDS.MODERATE.opacity;
      saturation = this.DECAY_THRESHOLDS.MODERATE.saturation;
    } else if (daysSinceAdded >= this.DECAY_THRESHOLDS.SLIGHT.days) {
      decayLevel = 'SLIGHT';
      opacity = this.DECAY_THRESHOLDS.SLIGHT.opacity;
      saturation = this.DECAY_THRESHOLDS.SLIGHT.saturation;
    } else {
      decayLevel = 'FRESH';
      opacity = this.DECAY_THRESHOLDS.FRESH.opacity;
      saturation = this.DECAY_THRESHOLDS.FRESH.saturation;
    }

    // Calculate days until purge
    const daysUntilPurge = Math.max(0, autoPurgeDays - daysSinceAdded);
    const shouldWarn = daysUntilPurge <= 3 && daysUntilPurge > 0;

    return {
      bvid: video.bvid,
      daysSinceAdded: Math.floor(daysSinceAdded),
      decayLevel,
      opacity,
      saturation,
      shouldWarn,
      daysUntilPurge: daysUntilPurge > 0 ? Math.ceil(daysUntilPurge) : null,
    };
  }

  /**
   * Calculate decay for multiple videos
   */
  calculateDecayForList(
    videos: VideoMetadata[],
    autoPurgeHours: number = 24
  ): DecayCalculation[] {
    return videos.map((video) => this.calculateDecay(video, autoPurgeHours));
  }

  /**
   * Get CSS styles for a decay level
   */
  getDecayStyles(decayLevel: DecayLevel): {
    filter: string;
    opacity: number;
    borderColor?: string;
  } {
    const base = this.DECAY_THRESHOLDS[decayLevel as keyof typeof this.DECAY_THRESHOLDS];
    
    const styles: Record<DecayLevel, { filter: string; opacity: number; borderColor?: string }> = {
      FRESH: {
        filter: 'none',
        opacity: 1.0,
      },
      SLIGHT: {
        filter: `saturate(${base.saturation})`,
        opacity: base.opacity,
      },
      MODERATE: {
        filter: `saturate(${base.saturation}) grayscale(0.2)`,
        opacity: base.opacity,
        borderColor: '#f59e0b', // amber-500
      },
      SEVERE: {
        filter: `saturate(${base.saturation}) grayscale(0.4)`,
        opacity: base.opacity,
        borderColor: '#f97316', // orange-500
      },
      CRITICAL: {
        filter: `saturate(${base.saturation}) grayscale(0.6)`,
        opacity: base.opacity,
        borderColor: '#ef4444', // red-500
      },
    };

    return styles[decayLevel];
  }

  /**
   * Check if video should be purged
   */
  shouldPurge(video: VideoMetadata, autoPurgeHours: number = 24): boolean {
    const daysSinceAdded = (Date.now() - video.addedAt) / (1000 * 60 * 60 * 24);
    const autoPurgeDays = autoPurgeHours / 24;
    return daysSinceAdded >= autoPurgeDays;
  }

  /**
   * Get videos that should be purged
   */
  getVideosToPurge(
    videos: VideoMetadata[],
    autoPurgeHours: number = 24
  ): VideoMetadata[] {
    return videos.filter((video) => this.shouldPurge(video, autoPurgeHours));
  }

  /**
   * Get decay statistics for a list of videos
   */
  getDecayStats(videos: VideoMetadata[]): {
    total: number;
    byLevel: Record<DecayLevel, number>;
    averageAge: number;
    purgeableCount: number;
  } {
    const stats = {
      total: videos.length,
      byLevel: {
        FRESH: 0,
        SLIGHT: 0,
        MODERATE: 0,
        SEVERE: 0,
        CRITICAL: 0,
      } as Record<DecayLevel, number>,
      averageAge: 0,
      purgeableCount: 0,
    };

    if (videos.length === 0) {
      return stats;
    }

    let totalAge = 0;

    for (const video of videos) {
      const decay = this.calculateDecay(video);
      stats.byLevel[decay.decayLevel]++;
      totalAge += decay.daysSinceAdded;

      if (decay.daysUntilPurge === null) {
        stats.purgeableCount++;
      }
    }

    stats.averageAge = Math.round(totalAge / videos.length);

    return stats;
  }

  /**
   * Get warning message for decay level
   */
  getWarningMessage(calculation: DecayCalculation): string | null {
    if (!calculation.shouldWarn) return null;

    if (calculation.daysUntilPurge === null) {
      return '该视频已过期，即将被自动清理';
    }

    if (calculation.daysUntilPurge <= 1) {
      return '该视频将在24小时内被清理，请尽快处理';
    }

    return `该视频将在 ${calculation.daysUntilPurge} 天后被清理`;
  }

  /**
   * Get decay progress (0-100%)
   */
  getDecayProgress(video: VideoMetadata, autoPurgeHours: number = 24): number {
    const daysSinceAdded = (Date.now() - video.addedAt) / (1000 * 60 * 60 * 24);
    const autoPurgeDays = autoPurgeHours / 24;
    const progress = (daysSinceAdded / autoPurgeDays) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  /**
   * Get relative freshness label
   */
  getFreshnessLabel(decayLevel: DecayLevel): string {
    const labels: Record<DecayLevel, string> = {
      FRESH: '新鲜',
      SLIGHT: '轻微陈旧',
      MODERATE: '中度陈旧',
      SEVERE: '严重陈旧',
      CRITICAL: '即将过期',
    };

    return labels[decayLevel];
  }

  /**
   * Save decay state to storage
   */
  async saveDecayState(state: VisualDecayState): Promise<void> {
    await chrome.storage.local.set({ visualDecay: state });
  }

  /**
   * Load decay state from storage
   */
  async loadDecayState(): Promise<VisualDecayState> {
    const storage = await chrome.storage.local.get('visualDecay');
    return (
      (storage.visualDecay as VisualDecayState) || {
        enabled: true,
        threshold: 24,
        lastPurgeCheck: Date.now(),
      }
    );
  }

  /**
   * Toggle decay visualization
   */
  async toggleDecay(enabled: boolean): Promise<void> {
    const state = await this.loadDecayState();
    state.enabled = enabled;
    await this.saveDecayState(state);
  }

  /**
   * Update decay threshold
   */
  async updateThreshold(hours: number): Promise<void> {
    const state = await this.loadDecayState();
    state.threshold = hours;
    await this.saveDecayState(state);
  }

  /**
   * Perform purge check and return purged videos
   */
  async performPurgeCheck(
    videos: VideoMetadata[]
  ): Promise<{ purged: VideoMetadata[]; remaining: VideoMetadata[] }> {
    const state = await this.loadDecayState();
    const purged = this.getVideosToPurge(videos, state.threshold);
    const remaining = videos.filter(
      (v) => !purged.some((p) => p.bvid === v.bvid)
    );

    // Update last check time
    state.lastPurgeCheck = Date.now();
    await this.saveDecayState(state);

    return { purged, remaining };
  }
}
