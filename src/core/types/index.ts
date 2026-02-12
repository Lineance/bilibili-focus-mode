export type VideoTag = 'LEARNING' | 'ENTERTAINMENT';

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
  totalAccrued: number;
  totalRepaid: number;
  bankruptcyCount: number;
  bankruptcyEndTime: number | null;
}

export interface BehaviorLog {
  lastInstantApplication: number;
  instantApplicationsToday: number;
  lastWatchEnd: number;
  currentCooldownUntil: number | null;
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
}

export interface ExtensionStorage {
  version: 3;
  limboList: LimboItem[];
  coolingList: CoolingItem[];
  instantList: InstantItem[];
  permanentGroups: PermanentGroup[];
  ghostList: GhostItem[];
  behaviorLog: BehaviorLog;
  globalStats: GlobalStats;
  debtAccount: DebtAccount;
  config: ExtensionConfig;
}

export type PermissionResult =
  | { allowed: true; reason: 'PERMANENT' | 'INSTANT' | 'COOLING_AVAILABLE' }
  | { allowed: false; reason: 'NO_PERMISSION' | 'COOLING_WAITING' | 'EXPIRED' | 'BANKRUPTCY' };
