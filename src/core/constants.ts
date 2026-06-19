import type {
  BehaviorLogState,
  DebtAccount,
  ExtensionConfig,
  ExtensionStorage,
  GlobalStats,
} from '@core/types';

// Time conversion constants
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Business logic constants
export const MIN_FUSE_LENGTH = 8;
export const MAX_LOG_ENTRIES = 1000;
export const MIN_REPENTANCE_LENGTH = 20;
export const TITLE_MAX_LENGTH = 50;
export const PERMISSION_CHECK_INTERVAL_MS = 60000;
export const FUSE_VALIDITY_MS = 5 * MS_PER_MINUTE;
export const TIME_WINDOW_BREAK_MS = MS_PER_HOUR;

export const DEFAULT_CONFIG: ExtensionConfig = {
  timeWindowEnabled: true,
  windowStart: '20:00',
  windowEnd: '21:00',
  limboCapacity: 5,
  limboReviewTime: '19:30',
  limboAutoPurgeHours: 24,
  coolingCooldownHours: 24,
  coolingAvailableHours: 48,
  instantDurationHours: 6,
  instantBreakFuse: true,
  baseFuseLength: 8,
  maxFuseLength: 64,
  maxGroups: 4,
  maxItemsPerGroup: 10,
  totalPermanentLimit: 20,
  ghostLifespanDays: 7,
  ghostResurrectFuseLength: 64,
  ghostDoublePenalty: true,
  debtEnabled: true,
  entertainmentRatio: 2.0,
  learningRepayRatio: -1.0,
  maxDebtMinutes: 60,
  bankruptcyLockHours: 24,
  bankruptcyOverrideMaxFuse: 128,
  dynamicFuseEnabled: true,
  postWatchCooldownMinutes: 5,
  dailyCoolingQuota: 0,
  dailyInstantQuota: 0,
  collectionDetectionEnabled: true,
  // Video player style simplification
  videoPlayerSimplification: {
    enabled: false,
    hideComments: true,
    hideRecommendations: true,
    hideDanmaku: true,
    hideSidebar: true,
    hideAds: true,
    minimalPlayer: false,
  },
  // Homepage style simplification
  homepageSimplification: {
    enabled: false,
    hideRecommendations: true,
    hideTrending: true,
    hideAds: true,
    hideLiveStreams: true,
    compactLayout: false,
    redirectToSearch: true,
  },
  // Dynamic page style simplification
  dynamicSimplification: {
    enabled: false,
    hideLiveStreams: true,
    hideRecommendations: true,
    hideAds: true,
    showOnlyFollowing: false,
    compactLayout: false,
  },
  // Live streaming page style simplification
  liveSimplification: {
    enabled: false,
    hideComments: true,
    hideGiftEffects: true,
    hideAds: true,
    hideSidebar: true,
    minimalPlayer: false,
  },
  // Search results page simplification
  searchSimplification: {
    enabled: false,
    hideAds: true,
    hideNonKeyword: false,
    hideLiveStreams: false,
    compactLayout: false,
  },
  // Keyword-based auto-allow rules
  keywordRules: {
    enabled: false,
    keywords: ['playlist', '歌单'],
    tag: 'LEARNING',
  },
  // Daily Bypass
  dailyBypassEnabled: true,
  dailyBypassQuota: 3,
  dailyBypassDurationMinutes: 30,
  // Native Messaging
  nativeMessagingEnabled: false,
};

export const DEFAULT_DEBT_ACCOUNT: DebtAccount = {
  currentDebt: 0,
  bankruptcyCount: 0,
  bankruptcyEndTime: null,
  totalEntertainmentMinutes: 0,
  totalLearningMinutes: 0,
  totalMusicMinutes: 0,
};

export const DEFAULT_BEHAVIOR_LOG: BehaviorLogState = {
  lastInstantApplication: 0,
  instantApplicationsToday: 0,
  coolingApplicationsToday: 0,
  lastQuotaResetDate: new Date().toISOString().slice(0, 10),
  lastWatchEnd: 0,
  currentCooldownUntil: null,
  dailyBypassesUsedToday: 0,
};

export const DEFAULT_GLOBAL_STATS: GlobalStats = {
  fuseApplicationsTotal: 0,
  fuseOverridesTotal: 0,
  ghostResurrectionsTotal: 0,
  bankruptcyHistory: [],
  lifecycleTransitions: {},
};

// Bilibili URLs
export const BILIBILI_BASE_URL = 'https://www.bilibili.com';
export const BILIBILI_LIVE_URL = 'https://live.bilibili.com';
export const BILIBILI_SEARCH_URL = 'https://search.bilibili.com';
export const BILIBILI_CDN_LIVE_COVER = 'https://i0.hdslb.com/bfs/live';

// Extension paths
export const MANAGER_PAGE_PATH = 'src/manager/index.html';
export const ICON_PATH = 'icon128.png';

export const DEFAULT_STORAGE: ExtensionStorage = {
  version: 3,
  limboList: [],
  coolingList: [],
  instantList: [],
  permanentGroups: [],
  ghostList: [],
  behaviorLog: DEFAULT_BEHAVIOR_LOG,
  globalStats: DEFAULT_GLOBAL_STATS,
  debtAccount: DEFAULT_DEBT_ACCOUNT,
  config: DEFAULT_CONFIG,
  allowedUploaders: [],
};
