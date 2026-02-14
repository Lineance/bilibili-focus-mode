import type {
  ExtensionConfig,
  ExtensionStorage,
  DebtAccount,
  BehaviorLogState,
  GlobalStats,
} from '@core/types';

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
};

export const DEFAULT_DEBT_ACCOUNT: DebtAccount = {
  currentDebt: 0,
  totalAccrued: 0,
  totalRepaid: 0,
  bankruptcyCount: 0,
  bankruptcyEndTime: null,
};

export const DEFAULT_BEHAVIOR_LOG: BehaviorLogState = {
  lastInstantApplication: 0,
  instantApplicationsToday: 0,
  lastWatchEnd: 0,
  currentCooldownUntil: null,
};

export const DEFAULT_GLOBAL_STATS: GlobalStats = {
  fuseApplicationsTotal: 0,
  fuseOverridesTotal: 0,
  ghostResurrectionsTotal: 0,
  bankruptcyHistory: [],
  lifecycleTransitions: {},
};

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
