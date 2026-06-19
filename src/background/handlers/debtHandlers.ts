import { DEFAULT_GLOBAL_STATS, DEFAULT_STORAGE } from '@core/constants';
import type { ProtocolMap } from '@core/protocol';
import { DebtService } from '@core/services';
import type { DebtAccount, GlobalStats } from '@core/types';
import { logger } from '@core/utils/logger';
import { storageQueue } from '@core/utils/storageQueue';
import { migrateDebtAccount, syncCurrentDebt } from '../DebtMigrationService';
import { assertMessageType, ensureStorageDefaults } from './utils';

export async function handleUpdateDebt(
  request: unknown,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['update-debt']['req']>(request);
  logger.debug('Background', 'Updating debt:', data);

  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;
  let debtAccount: DebtAccount = migrateDebtAccount(storage.debtAccount || DEFAULT_STORAGE.debtAccount);

  const { account: syncedAccount, changed } = syncCurrentDebt(debtAccount, config);
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

  await storageQueue.enqueue(() =>
    chrome.storage.local.set({
      debtAccount: updatedAccount,
      globalStats,
    })
  );

  return { currentDebt: updatedAccount.currentDebt, bankruptcyEndTime };
}

export async function handleSyncDebt(
  _request: unknown,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;
  let debtAccount: DebtAccount = migrateDebtAccount(storage.debtAccount || DEFAULT_STORAGE.debtAccount);

  const { account: syncedAccount, changed: syncChanged } = syncCurrentDebt(debtAccount, config);
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
