export interface FieldDescription {
  label: string;
  description: string;
  type: 'boolean' | 'number' | 'string' | 'time' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
}

export type VideoTag = 'LEARNING' | 'ENTERTAINMENT' | 'MUSIC';

export interface VideoMetadata {
  bvid: string;
  title: string;
  uploader: string;
  coverUrl: string;
  tag: VideoTag;
  addedAt: number;
}

export interface LimboItem extends VideoMetadata {
  sourceUrl: string;
}

export interface InstantItem extends VideoMetadata {
  expiresAt: number;
  fuseCode: string;
  usedFuse: boolean;
  bankruptcyOverride?: boolean;
}

export interface PermanentGroup {
  id: string;
  name: string;
  items: VideoMetadata[];
  debtPriority: number;
}



export interface WatchRecord {
  bvid: string;
  title: string;
  uploader: string;
  tag: VideoTag;
  startedAt: number;
  totalMinutes: number;
}

export interface DebtAccount {
  currentDebt: number;
  bankruptcyCount: number;
  bankruptcyEndTime: number | null;
  // Watch time statistics (used to calculate debt)
  totalEntertainmentMinutes: number;
  totalLearningMinutes: number;
  totalMusicMinutes: number;
}

export interface BehaviorLogState {
  lastInstantApplication: number;
  instantApplicationsToday: number;
  coolingApplicationsToday: number;
  lastQuotaResetDate: string;
  lastWatchEnd: number;
  currentCooldownUntil: number | null;
  dailyBypassesUsedToday: number;
}

export interface BehaviorLog {
  id: string;
  timestamp: number;
  action:
  | 'video_view'
  | 'video_start'
  | 'video_end'
  | 'video_pause'
  | 'fuse_applied'
  | 'fuse_verified'
  | 'fuse_rejected'
  | 'cooling_requested'
  | 'cooling_granted'
  | 'instant_requested'
  | 'instant_granted'
  | 'limbo_added'
  | 'limbo_removed'
  | 'limbo_promoted'
  | 'debt_incurred'
  | 'debt_repaid'
  | 'bankruptcy_declared'
  | 'config_changed'
  | 'group_created'
  | 'group_deleted'
  | 'item_moved';
  details?: Record<string, unknown>;
  bvid?: string;
  groupId?: string;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface LogFilter {
  startTime?: number;
  endTime?: number;
  actions?: BehaviorLog['action'][];
  bvid?: string;
  groupId?: string;
  limit?: number;
}

export interface BehaviorStats {
  totalViews: number;
  totalWatchTimeMinutes: number;
  videosByCategory: Record<string, number>;
  actionsByType: Record<string, number>;
  dailyBreakdown: Record<string, { views: number; watchTime: number }>;
  peakHour: number;
}

export interface AllowedUploader {
  id: string;
  name: string;
  addedAt: number;
  tag: VideoTag;
}

export interface BankruptcyRecord {
  timestamp: number;
  debtAtBankruptcy: number;
  bypassed: boolean;
}

export interface GlobalStats {
  fuseApplicationsTotal: number;
  fuseOverridesTotal: number;
  bankruptcyHistory: BankruptcyRecord[];
  lifecycleTransitions: Record<string, number>;
}

export interface ExtensionConfig {
  timeWindowEnabled: boolean;
  windowStart: string;
  windowEnd: string;
  limboCapacity: number;
  limboReviewTime: string;
  limboAutoPurgeHours: number;
  coolingCooldownHours: number;
  coolingAvailableHours: number;
  instantDurationHours: number;
  instantBreakFuse: boolean;
  baseFuseLength: number;
  maxFuseLength: number;
  maxGroups: number;
  maxItemsPerGroup: number;
  totalPermanentLimit: number;
  debtEnabled: boolean;
  entertainmentRatio: number;
  learningRepayRatio: number;
  maxDebtMinutes: number;
  bankruptcyLockHours: number;
  bankruptcyOverrideMaxFuse: number;
  dynamicFuseEnabled: boolean;
  postWatchCooldownMinutes: number;
  dailyCoolingQuota: number;
  dailyInstantQuota: number;
  collectionDetectionEnabled: boolean;
  // Video player style simplification
  videoPlayerSimplification: {
    enabled: boolean;
    hideComments: boolean;
    hideRecommendations: boolean;
    hideDanmaku: boolean;
    hideSidebar: boolean;
    hideAds: boolean;
    minimalPlayer: boolean;
  };
  // Homepage style simplification
  homepageSimplification: {
    enabled: boolean;
    hideRecommendations: boolean;
    hideTrending: boolean;
    hideAds: boolean;
    hideLiveStreams: boolean;
    compactLayout: boolean;
    redirectToSearch: boolean;
  };
  // Dynamic page style simplification
  dynamicSimplification: {
    enabled: boolean;
    hideLiveStreams: boolean;
    hideRecommendations: boolean;
    hideAds: boolean;
    showOnlyFollowing: boolean;
    compactLayout: boolean;
  };
  // Live streaming page style simplification
  liveSimplification: {
    enabled: boolean;
    hideComments: boolean;
    hideGiftEffects: boolean;
    hideAds: boolean;
    hideSidebar: boolean;
    minimalPlayer: boolean;
  };
  // Search results page simplification
  searchSimplification: {
    enabled: boolean;
    hideAds: boolean;
    hideNonKeyword: boolean;
    hideLiveStreams: boolean;
    compactLayout: boolean;
  };
  // Keyword-based auto-allow rules
  keywordRules: {
    enabled: boolean;
    keywords: string[];
    tag: VideoTag;
    items?: Array<{
      keyword: string;
      tag: VideoTag;
    }>;
  };
  // Daily Bypass
  dailyBypassEnabled: boolean;
  dailyBypassQuota: number;
  dailyBypassDurationMinutes: number;
  // Daily Watch Limit
  dailyWatchLimitMinutes: number;
  // Native Messaging
  nativeMessagingEnabled: boolean;
  // Appearance Enhancement (migrated from Bilibili-Evolved)
  appearanceEnhancement: AppearanceEnhancementConfig;
  // Live Enhancement
  liveEnhancement: LiveEnhancementConfig;
  // Video Player Enhancement
  videoPlayerEnhancement: VideoPlayerEnhancementConfig;
  // Theme Enhancement
  themeEnhancement: ThemeEnhancementConfig;
}

export interface ExtensionStorage {
  version: 3;
  limboList: LimboItem[];
  coolingList: CoolingItem[];
  instantList: InstantItem[];
  permanentGroups: PermanentGroup[];
  behaviorLog: BehaviorLogState;
  globalStats: GlobalStats;
  debtAccount: DebtAccount;
  config: ExtensionConfig;
  allowedUploaders: AllowedUploader[];
  watchHistory: WatchRecord[];
}

export type PermissionResult =
  | { allowed: true; reason: 'PERMANENT' | 'INSTANT' | 'COOLING_AVAILABLE' | 'KEYWORD' | 'DAILY_BYPASS' }
  | { allowed: false; reason: 'NO_PERMISSION' | 'COOLING_WAITING' | 'EXPIRED' | 'BANKRUPTCY' };

export type DecayLevel = 'FRESH' | 'SLIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface VisualDecayState {
  enabled: boolean;
  threshold: number;
  lastPurgeCheck: number;
}

// ============================================================
// Migrated Components Types (from Bilibili-Evolved)
// ============================================================

/** 外观增强配置 */
export interface AppearanceEnhancementConfig {
  enabled: boolean;
  elegantScrollbar: boolean;
  hideTrendingSearch: boolean;
  hideUserCard: boolean;
  hideUserPendent: boolean;
  hideVideoNotes: boolean;
  hideVideoShare: boolean;
  hideVideoReport: boolean;
  hideVideoTopMask: boolean;
  hideRelatedVideos: boolean;
  hideRecommendedLive: boolean;
  disableSpecialDanmaku: boolean;
  removePromotions: boolean;
}

/** 直播增强配置 */
export interface LiveEnhancementConfig {
  enabled: boolean;
  hidePlayerBlur: boolean;
  removeWatermark: boolean;
  removeMaskPanel: boolean;
}

/** 播放器增强配置 */
export interface VideoPlayerEnhancementConfig {
  enabled: boolean;
  extendSpeed: boolean;
  rememberSpeed: boolean;
}

/** 主题增强配置 */
export interface ThemeEnhancementConfig {
  darkModeFollowSystem: boolean;
  replaceCover: boolean;
}

// Export result types
export * from './result';

// Export theme types
export * from './theme';
