import { DEFAULT_STORAGE } from '@core/constants';
import type { BehaviorLogState, ExtensionConfig, ExtensionStorage } from '@core/types';

export function ensureStorageDefaults(data: Partial<ExtensionStorage>): ExtensionStorage {
  return {
    ...DEFAULT_STORAGE,
    ...data,
    config: { ...DEFAULT_STORAGE.config, ...(data.config || {}) },
    debtAccount: { ...DEFAULT_STORAGE.debtAccount, ...(data.debtAccount || {}) },
    behaviorLog: { ...DEFAULT_STORAGE.behaviorLog, ...(data.behaviorLog || {}) },
    globalStats: { ...DEFAULT_STORAGE.globalStats, ...(data.globalStats || {}) },
  };
}

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeBehaviorLog(behaviorLog?: Partial<BehaviorLogState>): BehaviorLogState {
  return {
    ...DEFAULT_STORAGE.behaviorLog,
    ...behaviorLog,
  };
}

export function resetQuotaIfNeeded(behaviorLog: BehaviorLogState): BehaviorLogState {
  const today = getTodayKey();
  if (behaviorLog.lastQuotaResetDate === today) {
    return behaviorLog;
  }

  return {
    ...behaviorLog,
    lastQuotaResetDate: today,
    instantApplicationsToday: 0,
    coolingApplicationsToday: 0,
    dailyBypassesUsedToday: 0,
  };
}

export function assertMessageType<T>(message: unknown): T {
  if (!message || typeof message !== 'object') {
    throw new Error('Invalid message format');
  }
  // webext-bridge passes data directly, not wrapped in a 'data' property
  return message as T;
}

export function getStorageNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

export function getStorageString(value: unknown, fallback: string | null): string | null {
  return typeof value === 'string' ? value : fallback;
}

export function pickConfigSnapshot(config: ExtensionConfig) {
  return {
    debtEnabled: config.debtEnabled,
    entertainmentRatio: config.entertainmentRatio,
    learningRepayRatio: config.learningRepayRatio,
    maxDebtMinutes: config.maxDebtMinutes,
    bankruptcyLockHours: config.bankruptcyLockHours,
    postWatchCooldownMinutes: config.postWatchCooldownMinutes,
    instantBreakFuse: config.instantBreakFuse,
    collectionDetectionEnabled: config.collectionDetectionEnabled,
  };
}
