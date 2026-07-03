import { DEFAULT_GLOBAL_STATS, DEFAULT_STORAGE, MAX_WATCH_HISTORY } from '@core/constants';
import type { ProtocolMap } from '@core/protocol';
import { DebtService } from '@core/services';
import type { DebtAccount, GlobalStats, WatchRecord } from '@core/types';
import { logger } from '@core/utils/logger';
import { storageQueue } from '@core/utils/storageQueue';
import { migrateDebtAccount, syncCurrentDebt } from '../DebtMigrationService';
import { assertMessageType, ensureStorageDefaults } from './utils';

export async function handleUpdateDebt(request: unknown): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['update-debt']['req']>(request);
  logger.debug('Background', 'Updating debt:', data);

  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;
  let debtAccount: DebtAccount = migrateDebtAccount(storage.debtAccount || DEFAULT_STORAGE.debtAccount);

  const { account: syncedAccount, changed } = syncCurrentDebt(debtAccount);
  if (changed) {
    logger.debug('Background', 'Current debt synced with totals');
  }
  debtAccount = syncedAccount;

  logger.debug('Background', 'Current debt account:', debtAccount);

  if (!config.debtEnabled) {
    return { currentDebt: debtAccount.currentDebt, bankruptcyEndTime: debtAccount.bankruptcyEndTime };
  }

  const debtService = new DebtService(
    config.entertainmentRatio,
    config.learningRepayRatio,
    config.maxDebtMinutes
  );

  const updatedAccount = debtService.updateDebt(debtAccount, data.minutes, data.tag);
  logger.debug('Background', 'Updated account:', updatedAccount);
  let bankruptcyEndTime = updatedAccount.bankruptcyEndTime;
  let bankruptcyDeclared = false;

  const now = Date.now();
  const isCurrentlyBankrupt = debtService.isBankrupt(updatedAccount);
  const hasActiveLock = updatedAccount.bankruptcyEndTime && updatedAccount.bankruptcyEndTime > now;

  if (isCurrentlyBankrupt) {
    if (!hasActiveLock) {
      bankruptcyEndTime = debtService.calculateBankruptcyEndTime(config.bankruptcyLockHours);
      updatedAccount.bankruptcyEndTime = bankruptcyEndTime;
      updatedAccount.bankruptcyCount = (updatedAccount.bankruptcyCount || 0) + 1;
      bankruptcyDeclared = true;
    }
  }

  const globalStats: GlobalStats = storage.globalStats || DEFAULT_GLOBAL_STATS;
  if (bankruptcyDeclared) {
    const maxHistoryLength = 100;
    const newEntry = { timestamp: Date.now(), debtAtBankruptcy: updatedAccount.currentDebt, bypassed: false };
    globalStats.bankruptcyHistory = [
      ...globalStats.bankruptcyHistory.slice(-(maxHistoryLength - 1)),
      newEntry,
    ];
  }

  // Update watch history
  const watchHistoryStorage = await chrome.storage.local.get('watchHistory');
  const watchHistory: WatchRecord[] = (watchHistoryStorage.watchHistory as WatchRecord[] | undefined) || [];
  const existingIndex = watchHistory.findIndex((r) => r.bvid === data.bvid);
  if (existingIndex >= 0) {
    watchHistory[existingIndex] = {
      ...watchHistory[existingIndex],
      totalMinutes: watchHistory[existingIndex].totalMinutes + data.minutes,
    };
  } else {
    watchHistory.push({
      bvid: data.bvid,
      title: data.bvid,
      uploader: '',
      tag: data.tag,
      startedAt: now,
      totalMinutes: data.minutes,
    });
  }
  // Trim to max history
  if (watchHistory.length > MAX_WATCH_HISTORY) {
    watchHistory.splice(0, watchHistory.length - MAX_WATCH_HISTORY);
  }

  await storageQueue.enqueue(() =>
    chrome.storage.local.set({
      debtAccount: updatedAccount,
      globalStats,
      watchHistory,
    })
  );

  return { currentDebt: updatedAccount.currentDebt, bankruptcyEndTime };
}

export async function handleSyncDebt(): Promise<unknown> {
  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;
  let debtAccount: DebtAccount = migrateDebtAccount(storage.debtAccount || DEFAULT_STORAGE.debtAccount);

  const { account: syncedAccount, changed: syncChanged } = syncCurrentDebt(debtAccount);
  debtAccount = syncedAccount;
  let changed = syncChanged;

  const now = Date.now();
  const debtService = new DebtService(
    config.entertainmentRatio,
    config.learningRepayRatio,
    config.maxDebtMinutes
  );

  const isCurrentlyBankrupt = debtService.isBankrupt(debtAccount);
  const hasActiveLock = debtAccount.bankruptcyEndTime && debtAccount.bankruptcyEndTime > now;

  if (!isCurrentlyBankrupt && hasActiveLock) {
    debtAccount.bankruptcyEndTime = null;
    changed = true;
    logger.debug('Background', 'Bankruptcy lock cleared during sync');
  }

  if (changed) {
    await chrome.storage.local.set({ debtAccount });
  }

  return { currentDebt: debtAccount.currentDebt, bankruptcyEndTime: debtAccount.bankruptcyEndTime };
}
