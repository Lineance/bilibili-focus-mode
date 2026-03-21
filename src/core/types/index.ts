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

export interface CoolingItem extends VideoMetadata {
  availableAt: number;
  expiresAt: number;
}

export interface InstantItem extends VideoMetadata {
  expiresAt: number;
  fuseCode: string;
  usedFuse: boolean;
}

export interface PermanentGroup {
  id: string;
  name: string;
  items: VideoMetadata[];
  debtPriority: number;
}

export interface GhostItem extends VideoMetadata {
  diedAt: number;
  canResurrectUntil: number;
  resurrected?: boolean;
  repentanceReason?: string;
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
  | 'ghost_created'
  | 'ghost_resurrected'
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
  ghostResurrectionsTotal: number;
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
  ghostLifespanDays: number;
  ghostResurrectFuseLength: number;
  ghostDoublePenalty: boolean;
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
}

export interface ExtensionStorage {
  version: 3;
  limboList: LimboItem[];
  coolingList: CoolingItem[];
  instantList: InstantItem[];
  permanentGroups: PermanentGroup[];
  ghostList: GhostItem[];
  behaviorLog: BehaviorLogState;
  globalStats: GlobalStats;
  debtAccount: DebtAccount;
  config: ExtensionConfig;
  allowedUploaders: AllowedUploader[];
}

export type PermissionResult =
  | { allowed: true; reason: 'PERMANENT' | 'INSTANT' | 'COOLING_AVAILABLE' }
  | { allowed: false; reason: 'NO_PERMISSION' | 'COOLING_WAITING' | 'EXPIRED' | 'BANKRUPTCY' };

export type DecayLevel = 'FRESH' | 'SLIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface VisualDecayState {
  enabled: boolean;
  threshold: number;
  lastPurgeCheck: number;
}

// Export theme types
export * from './theme';
