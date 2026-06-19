import { DEFAULT_GLOBAL_STATS, DEFAULT_STORAGE } from '@core/constants';
import type { ProtocolMap } from '@core/protocol';
import { BehaviorLoggingService, DebtService, FuseApplicationService, FuseService, PermissionService } from '@core/services';
import { TimeWindowService } from '@core/services/TimeWindowService';
import type { BehaviorLogState, DebtAccount, ExtensionConfig, ExtensionStorage, GlobalStats } from '@core/types';
import { logger } from '@core/utils/logger';
import { onMessage } from 'webext-bridge/background';
import { migrateDebtAccount, syncCurrentDebt } from './DebtMigrationService';

const TIME_WINDOW_FUSE_KEY = 'timeWindowFuse';
const TIME_WINDOW_FUSE_EXPIRES_KEY = 'timeWindowFuseExpiresAt';

function ensureStorageDefaults(data: Partial<ExtensionStorage>): ExtensionStorage {
  return { ...DEFAULT_STORAGE, ...data };
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeBehaviorLog(behaviorLog?: Partial<BehaviorLogState>): BehaviorLogState {
  return {
    ...DEFAULT_STORAGE.behaviorLog,
    ...behaviorLog,
  };
}

function resetQuotaIfNeeded(behaviorLog: BehaviorLogState): BehaviorLogState {
  const today = getTodayKey();
  if (behaviorLog.lastQuotaResetDate === today) {
    return behaviorLog;
  }

  return {
    ...behaviorLog,
    lastQuotaResetDate: today,
    instantApplicationsToday: 0,
    coolingApplicationsToday: 0,
  };
}

function pickConfigSnapshot(config: ExtensionConfig) {
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

export function registerMessageHandlers(): void {
  onMessage('check-permission', async (message) => {
    const data = message.data as unknown as ProtocolMap['check-permission']['req'];
    logger.debug('Background', 'Checking permission for:', data.bvid, 'uploader:', data.uploaderName);

    const storage = ensureStorageDefaults(await chrome.storage.local.get());
    const service = new PermissionService(storage);
    const result = service.check(data.bvid, data.uploaderName, data.title);
    const config = storage.config;

    const twBreak = await chrome.storage.local.get('timeWindowBreakUntil');
    const breakUntil = (twBreak?.timeWindowBreakUntil as number | undefined) || 0;
    const now = Date.now();
    const isVirtuallyInWindow = now < breakUntil;

    return {
      ...result,
      inReviewWindow: result.inReviewWindow || isVirtuallyInWindow,
      config: pickConfigSnapshot(config),
    };
  });

  onMessage('add-to-limbo', async (message) => {
    const data = message.data as unknown as ProtocolMap['add-to-limbo']['req'];
    logger.debug('Background', 'Adding to limbo:', data.metadata.bvid);

    const storage = ensureStorageDefaults(await chrome.storage.local.get());
    logger.debug('Background', 'Current storage:', {
      limboListLength: storage.limboList?.length || 0,
      limboCapacity: storage.config?.limboCapacity
    });

    const limboList = storage.limboList || [];
    const capacity = storage.config?.limboCapacity ?? 5;

    if (limboList.length >= capacity) {
      logger.debug('Background', 'Limbo is full:', limboList.length, '>=', capacity);
      return { success: false, limboCount: limboList.length };
    }

    if (limboList.some((item) => item.bvid === data.metadata.bvid)) {
      logger.debug('Background', 'Video already in limbo:', data.metadata.bvid);
      return { success: true, limboCount: limboList.length };
    }

    const newItem = {
      ...data.metadata,
      sourceUrl: data.sourceUrl,
    };

    const newLimboList = [...limboList, newItem];
    await chrome.storage.local.set({
      limboList: newLimboList,
    });

    logger.debug('Background', 'Video added to limbo. New count:', newLimboList.length);

    return { success: true, limboCount: newLimboList.length };
  });

  onMessage('update-debt', async (message) => {
    const data = message.data as unknown as ProtocolMap['update-debt']['req'];
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
    } else if (hasActiveLock) {
      updatedAccount.bankruptcyEndTime = null;
      bankruptcyEndTime = null;
      logger.debug('Background', 'Bankruptcy lock cleared due to debt repayment');
    }

    const globalStats: GlobalStats = storage.globalStats || DEFAULT_GLOBAL_STATS;
    if (bankruptcyDeclared) {
      globalStats.bankruptcyHistory = [
        ...globalStats.bankruptcyHistory,
        {
          timestamp: Date.now(),
          debtAtBankruptcy: updatedAccount.currentDebt,
          bypassed: false,
        },
      ];
    }

    await chrome.storage.local.set({
      debtAccount: updatedAccount,
      globalStats,
    });

    return { currentDebt: updatedAccount.currentDebt, bankruptcyEndTime };
  });

  onMessage('sync-debt', async () => {
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
  });

  onMessage('verify-fuse', async (message) => {
    const data = message.data as unknown as ProtocolMap['verify-fuse']['req'];
    const storage = ensureStorageDefaults(await chrome.storage.local.get());
    const config = storage.config;
    const service = new FuseApplicationService(config);
    return service.verifyFuse(data.bvid, data.fuseCode);
  });

  onMessage('apply-fuse', async (message) => {
    const data = message.data as unknown as ProtocolMap['apply-fuse']['req'];
    const storage = ensureStorageDefaults(await chrome.storage.local.get());
    const config = storage.config;
    const behaviorLog = resetQuotaIfNeeded(normalizeBehaviorLog(storage.behaviorLog));

    const timeWindowService = new TimeWindowService(config);
    const windowStatus = timeWindowService.checkTimeWindow();

    if (!windowStatus.isInWindow && !timeWindowService.canBreakWindow()) {
      return { success: false, message: '当前不允许在审批时间外使用熔断码' };
    }

    if (behaviorLog.currentCooldownUntil && Date.now() < behaviorLog.currentCooldownUntil) {
      return { success: false, message: '冷静期未结束，暂时无法申请熔断码' };
    }

    if (config.dailyInstantQuota > 0 && behaviorLog.instantApplicationsToday >= config.dailyInstantQuota) {
      return { success: false, message: '已达到今日即时配额' };
    }

    const service = new FuseApplicationService(config);
    let remainingBankruptcyMinutes = 0;
    if (data.isBankruptcy && storage.debtAccount?.bankruptcyEndTime) {
      remainingBankruptcyMinutes = Math.max(
        0,
        Math.ceil((storage.debtAccount.bankruptcyEndTime - Date.now()) / 60000)
      );
    }

    const result = await service.applyForFuse(
      data.metadata,
      behaviorLog,
      data.isBankruptcy,
      remainingBankruptcyMinutes
    );

    if (!result.success) {
      return { success: false, message: result.reason };
    }

    const globalStats: GlobalStats = storage.globalStats || DEFAULT_GLOBAL_STATS;
    globalStats.fuseApplicationsTotal++;

    await chrome.storage.local.set({
      globalStats,
    });

    return {
      success: true,
      message: '熔断码申请成功',
      fuseCode: result.item.fuseCode,
      expiresAt: result.item.expiresAt,
    };
  });

  onMessage('watch-ended', async (message) => {
    const data = message.data as unknown as ProtocolMap['watch-ended']['req'];
    const storage = ensureStorageDefaults(await chrome.storage.local.get());
    const config = storage.config;
    const behaviorLog = normalizeBehaviorLog(storage.behaviorLog);

    const cooldownMinutes = config.postWatchCooldownMinutes;
    const cooldownUntil = cooldownMinutes > 0
      ? data.endedAt + cooldownMinutes * 60 * 1000
      : null;

    const updatedBehaviorLog: BehaviorLogState = {
      ...behaviorLog,
      lastWatchEnd: data.endedAt,
      currentCooldownUntil: cooldownUntil,
    };

    await chrome.storage.local.set({ behaviorLog: updatedBehaviorLog });

    return { success: true, cooldownUntil };
  });

  onMessage('get-full-config', async () => {
    const storage = ensureStorageDefaults(await chrome.storage.local.get());
    const config = storage.config;
    const debtAccount = storage.debtAccount || DEFAULT_STORAGE.debtAccount;
    return { config, debtAccount };
  });

  onMessage('apply-time-window-fuse', async () => {
    const storage = ensureStorageDefaults(await chrome.storage.local.get());
    const config = storage.config;

    if (!config.instantBreakFuse) {
      return { success: false, message: '熔断功能未启用' };
    }

    const fuseService = new FuseService(config);
    const loggingService = new BehaviorLoggingService();
    const fuseLength = fuseService.calculateFuseLength(0, false);
    const timeWindowFuseCode = fuseService.generateFuseCode(fuseLength);
    const timeWindowFuseExpiresAt = Date.now() + 5 * 60 * 1000;

    await loggingService.logEvent('fuse_applied', {
      type: 'time_window',
      fuseLength,
    });

    await chrome.storage.local.set({
      [TIME_WINDOW_FUSE_KEY]: timeWindowFuseCode,
      [TIME_WINDOW_FUSE_EXPIRES_KEY]: timeWindowFuseExpiresAt,
    });

    return {
      success: true,
      message: '熔断码已生成',
      fuseCode: timeWindowFuseCode,
      expiresAt: timeWindowFuseExpiresAt
    };
  });

  onMessage('verify-time-window-fuse', async (message) => {
    const data = message.data as unknown as ProtocolMap['verify-time-window-fuse']['req'];
    const storage = ensureStorageDefaults(await chrome.storage.local.get());
    const config = storage.config;

    const storageData = await chrome.storage.local.get([TIME_WINDOW_FUSE_KEY, TIME_WINDOW_FUSE_EXPIRES_KEY]);
    const timeWindowFuseCode = storageData[TIME_WINDOW_FUSE_KEY] as string | null;
    const timeWindowFuseExpiresAt = storageData[TIME_WINDOW_FUSE_EXPIRES_KEY] as number | null;

    if (!timeWindowFuseCode || !timeWindowFuseExpiresAt) {
      return { success: false, message: '没有有效的熔断码，请先生成' };
    }

    if (Date.now() > timeWindowFuseExpiresAt) {
      await chrome.storage.local.remove([TIME_WINDOW_FUSE_KEY, TIME_WINDOW_FUSE_EXPIRES_KEY]);
      return { success: false, message: '熔断码已过期，请重新生成' };
    }

    const fuseService = new FuseService(config);
    const isValid = fuseService.verifyFuseCode(data.fuseCode, timeWindowFuseCode);
    const loggingService = new BehaviorLoggingService();

    if (isValid) {
      await loggingService.logEvent('fuse_verified', {
        type: 'time_window',
      });
      await chrome.storage.local.remove([TIME_WINDOW_FUSE_KEY, TIME_WINDOW_FUSE_EXPIRES_KEY]);
      const breakUntil = Date.now() + 60 * 60 * 1000;
      await chrome.storage.local.set({ timeWindowBreakUntil: breakUntil });
      return { success: true, message: '熔断码验证成功', expiresAt: breakUntil };
    }

    await loggingService.logEvent('fuse_rejected', {
      type: 'time_window',
      reason: 'invalid_code',
    });
    return { success: false, message: '熔断码无效' };
  });
}
