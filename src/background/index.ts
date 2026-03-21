import { DEFAULT_GLOBAL_STATS, DEFAULT_STORAGE } from '@core/constants';
import type { ProtocolMap } from '@core/protocol';
import { BehaviorLoggingService, DebtService, FuseApplicationService, FuseService, PermissionService } from '@core/services';
import { TimeWindowService } from '@core/services/TimeWindowService';
import type { BehaviorLogState, DebtAccount, ExtensionConfig, ExtensionStorage, GlobalStats, VideoMetadata } from '@core/types';
import { onMessage } from 'webext-bridge/background';

console.log('[Background] Service worker started');

function scheduleLimboReviewReminder(timeString: string) {
  const [hour, minute] = timeString.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  chrome.alarms.create('limbo-review-reminder', {
    when: next.getTime(),
    periodInMinutes: 24 * 60,
  });
}

function scheduleLimboAutoPurge(hours: number) {
  if (hours <= 0) {
    chrome.alarms.clear('limbo-auto-purge');
    return;
  }

  chrome.alarms.create('limbo-auto-purge', {
    when: Date.now() + 60 * 1000,
    periodInMinutes: 60,
  });
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

// Initialize storage on install
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed:', details.reason);

  if (details.reason === 'install') {
    chrome.storage.local.set(DEFAULT_STORAGE).then(() => {
      console.log('[Background] Default storage initialized');
      scheduleLimboReviewReminder(DEFAULT_STORAGE.config.limboReviewTime);
      scheduleLimboAutoPurge(DEFAULT_STORAGE.config.limboAutoPurgeHours);
    });
  }
});

// Handle alarms for scheduled tasks
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[Background] Alarm triggered:', alarm.name);

  if (alarm.name === 'limbo-review-reminder') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Bilibili Focus Mode',
      message: 'Time to review your Limbo list!',
    });
  }

  if (alarm.name === 'limbo-auto-purge') {
    chrome.storage.local.get().then((storage) => {
      const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
      if (config.limboAutoPurgeHours <= 0) return;

      const cutoff = Date.now() - config.limboAutoPurgeHours * 60 * 60 * 1000;
      const limboList = (storage.limboList || []) as VideoMetadata[];
      const updatedLimboList = limboList.filter((item) => item.addedAt >= cutoff);

      if (updatedLimboList.length !== limboList.length) {
        chrome.storage.local.set({ limboList: updatedLimboList });
      }
    });
  }
});

// Message handlers
onMessage('check-permission', async (message) => {
  const data = message.data as unknown as ProtocolMap['check-permission']['req'];
  console.log('[Background] Checking permission for:', data.bvid, 'uploader:', data.uploaderName);

  const storage = await chrome.storage.local.get() as typeof DEFAULT_STORAGE;
  const service = new PermissionService(storage);
  const result = service.check(data.bvid, data.uploaderName, data.title);
  const config = storage.config || DEFAULT_STORAGE.config;

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
  console.log('[Background] Adding to limbo:', data.metadata.bvid);

  const storage = await chrome.storage.local.get() as typeof DEFAULT_STORAGE;
  console.log('[Background] Current storage:', {
    limboListLength: storage.limboList?.length || 0,
    limboCapacity: storage.config?.limboCapacity
  });

  const limboList = storage.limboList || [];
  const capacity = storage.config?.limboCapacity ?? 5;

  // Check capacity
  if (limboList.length >= capacity) {
    console.log('[Background] Limbo is full:', limboList.length, '>=', capacity);
    return { success: false, limboCount: limboList.length };
  }

  // Check if already exists
  if (limboList.some((item) => item.bvid === data.metadata.bvid)) {
    console.log('[Background] Video already in limbo:', data.metadata.bvid);
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

  console.log('[Background] Video added to limbo. New count:', newLimboList.length);

  return { success: true, limboCount: newLimboList.length };
});

onMessage('update-debt', async (message) => {
  const data = message.data as unknown as ProtocolMap['update-debt']['req'];
  console.log('[Background] Updating debt:', data);

  const storage = await chrome.storage.local.get() as ExtensionStorage;
  const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
  let debtAccount: DebtAccount = storage.debtAccount || DEFAULT_STORAGE.debtAccount;
  
  // Migrate old field names and ensure currentDebt is in sync with totals
  interface LegacyDebtAccount {
    totalAccrued?: number;
    totalRepaid?: number;
    totalMusicMinutes?: number;
  }
  
  if ('totalAccrued' in debtAccount || 'totalRepaid' in debtAccount) {
    const legacyDebt = debtAccount as LegacyDebtAccount & typeof debtAccount;
    debtAccount = {
      ...debtAccount,
      totalEntertainmentMinutes: legacyDebt.totalAccrued || 0,
      totalLearningMinutes: legacyDebt.totalRepaid || 0,
      totalMusicMinutes: legacyDebt.totalMusicMinutes || 0,
    };
    // Delete legacy fields - using type assertion since we know these fields exist
    const mutableDebt = debtAccount as unknown as Record<string, unknown>;
    delete mutableDebt.totalAccrued;
    delete mutableDebt.totalRepaid;
  }

  // Recalculate currentDebt based on totals to fix sync issues
  // Ensure new fields are initialized
  if (debtAccount.totalMusicMinutes === undefined) {
    debtAccount.totalMusicMinutes = 0;
  }
  
  // entertainmentDebt = totalEntertainmentMinutes * config.entertainmentRatio
  // learningRepaid = totalLearningMinutes * config.learningRepayRatio
  // netDebt = entertainmentDebt + learningRepaid
  const entertainmentDebt = (debtAccount.totalEntertainmentMinutes || 0) * config.entertainmentRatio;
  const learningRepaid = (debtAccount.totalLearningMinutes || 0) * config.learningRepayRatio;
  const recalculatedDebt = entertainmentDebt + learningRepaid;
  
  // If the stored currentDebt is out of sync with recalculated debt (due to past capping),
  // we update it to match the dashboard's source of truth.
  if (Math.abs(debtAccount.currentDebt - recalculatedDebt) > 0.1) {
    console.log('[Background] Syncing currentDebt with totals:', debtAccount.currentDebt, '->', recalculatedDebt);
    debtAccount.currentDebt = recalculatedDebt;
  }
  
  console.log('[Background] Current debt account:', debtAccount);

  if (!config.debtEnabled) {
    return { currentDebt: debtAccount.currentDebt, bankruptcyEndTime: debtAccount.bankruptcyEndTime };
  }

  const debtService = new DebtService(
    config.entertainmentRatio,
    config.learningRepayRatio,
    config.maxDebtMinutes
  );

  const updatedAccount = debtService.updateDebt(debtAccount, data.minutes, data.tag);
  console.log('[Background] Updated account:', updatedAccount);
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
    // Recovery: If debt is repaid below threshold, clear bankruptcy lock
    // This rewards the user for actively learning to repay their debt
    updatedAccount.bankruptcyEndTime = null;
    bankruptcyEndTime = null;
    console.log('[Background] Bankruptcy lock cleared due to debt repayment');
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
  const storage = await chrome.storage.local.get() as ExtensionStorage;
  const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
  let debtAccount: DebtAccount = storage.debtAccount || DEFAULT_STORAGE.debtAccount;

  // Perform sync logic (same as in update-debt)
  if (debtAccount.totalMusicMinutes === undefined) {
    debtAccount.totalMusicMinutes = 0;
  }
  
  const entertainmentDebt = (debtAccount.totalEntertainmentMinutes || 0) * config.entertainmentRatio;
  const learningRepaid = (debtAccount.totalLearningMinutes || 0) * config.learningRepayRatio;
  const recalculatedDebt = entertainmentDebt + learningRepaid;

  let changed = false;
  if (Math.abs(debtAccount.currentDebt - recalculatedDebt) > 0.1) {
    debtAccount.currentDebt = recalculatedDebt;
    changed = true;
  }

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
    console.log('[Background] Bankruptcy lock cleared during sync');
  }

  if (changed) {
    await chrome.storage.local.set({ debtAccount });
  }

  return { currentDebt: debtAccount.currentDebt, bankruptcyEndTime: debtAccount.bankruptcyEndTime };
});

onMessage('verify-fuse', async (message) => {
  const data = message.data as unknown as ProtocolMap['verify-fuse']['req'];
  const storage = await chrome.storage.local.get() as ExtensionStorage;
  const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
  const service = new FuseApplicationService(config);
  return service.verifyFuse(data.bvid, data.fuseCode);
});

onMessage('apply-fuse', async (message) => {
  const data = message.data as unknown as ProtocolMap['apply-fuse']['req'];
  const storage = await chrome.storage.local.get() as ExtensionStorage;
  const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
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
  const storage = await chrome.storage.local.get() as ExtensionStorage;
  const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
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
  const storage = await chrome.storage.local.get() as ExtensionStorage;
  const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
  const debtAccount = storage.debtAccount || DEFAULT_STORAGE.debtAccount;
  return { config, debtAccount };
});

// Time window fuse code storage - now persisted in chrome.storage.session for MV3
const TIME_WINDOW_FUSE_KEY = 'timeWindowFuse';
const TIME_WINDOW_FUSE_EXPIRES_KEY = 'timeWindowFuseExpiresAt';

onMessage('apply-time-window-fuse', async () => {
  const storage = await chrome.storage.local.get() as ExtensionStorage;
  const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;

  if (!config.instantBreakFuse) {
    return { success: false, message: '熔断功能未启用' };
  }

  const fuseService = new FuseService(config);
  const loggingService = new BehaviorLoggingService();
  const fuseLength = fuseService.calculateFuseLength(0, false); // Base length for time window
  const timeWindowFuseCode = fuseService.generateFuseCode(fuseLength);
  const timeWindowFuseExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  // Log the event
  await loggingService.logEvent('fuse_applied', {
    type: 'time_window',
    fuseLength,
  });

  // Persist to local storage for multi-context reliability
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
  const storage = await chrome.storage.local.get() as ExtensionStorage;
  const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;

  // Retrieve from persistent local storage
  const storageData = await chrome.storage.local.get([TIME_WINDOW_FUSE_KEY, TIME_WINDOW_FUSE_EXPIRES_KEY]);
  let timeWindowFuseCode = storageData[TIME_WINDOW_FUSE_KEY] as string | null;
  let timeWindowFuseExpiresAt = storageData[TIME_WINDOW_FUSE_EXPIRES_KEY] as number | null;

  if (!timeWindowFuseCode || !timeWindowFuseExpiresAt) {
    return { success: false, message: '没有有效的熔断码，请先生成' };
  }

  if (Date.now() > timeWindowFuseExpiresAt) {
    // Clear expired fuse code
    await chrome.storage.local.remove([TIME_WINDOW_FUSE_KEY, TIME_WINDOW_FUSE_EXPIRES_KEY]);
    return { success: false, message: '熔断码已过期，请重新生成' };
  }

  const fuseService = new FuseService(config);
  const isValid = fuseService.verifyFuseCode(data.fuseCode, timeWindowFuseCode);
  const loggingService = new BehaviorLoggingService();

  if (isValid) {
    // Log success
    await loggingService.logEvent('fuse_verified', {
      type: 'time_window',
    });
    // Clear the fuse code after successful verification (one-time use)
    await chrome.storage.local.remove([TIME_WINDOW_FUSE_KEY, TIME_WINDOW_FUSE_EXPIRES_KEY]);
    const breakUntil = Date.now() + 60 * 60 * 1000; // 1 hour break
    // Persist a global break for time window so content permission can honor it
    await chrome.storage.local.set({ timeWindowBreakUntil: breakUntil });
    return { success: true, message: '熔断码验证成功', expiresAt: breakUntil };
  }

  await loggingService.logEvent('fuse_rejected', {
    type: 'time_window',
    reason: 'invalid_code',
  });
  return { success: false, message: '熔断码无效' };
});

chrome.storage.local.get('config').then((storage) => {
  const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
  const limboReviewTime = config.limboReviewTime || DEFAULT_STORAGE.config.limboReviewTime;
  const limboAutoPurgeHours = config.limboAutoPurgeHours ?? DEFAULT_STORAGE.config.limboAutoPurgeHours;
  scheduleLimboReviewReminder(limboReviewTime);
  scheduleLimboAutoPurge(limboAutoPurgeHours);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.config?.newValue) return;
  const newConfig = changes.config.newValue as typeof DEFAULT_STORAGE.config;
  scheduleLimboReviewReminder(newConfig.limboReviewTime);
  scheduleLimboAutoPurge(newConfig.limboAutoPurgeHours);
});

// Handle open options page request from content script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'openOptionsPage') {
    console.log('[Background] Opening options page');
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/manager/index.html')
    }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Error opening options page:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Background] Options page opened in tab:', tab?.id);
        sendResponse({ success: true, tabId: tab?.id });
      }
    });
    return true; // Keep message channel open for async response
  }
});

// External message handler for extension detection
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('[Background] External message received:', request, 'from:', sender.id);
  
  if (request.message === 'version' || request.message === 'ping') {
    const manifest = chrome.runtime.getManifest();
    sendResponse({
      type: 'success',
      version: manifest.version,
      enabled: true,
      id: chrome.runtime.id,
    });
  } else {
    sendResponse({
      type: 'error',
      message: 'Unknown request type',
    });
  }
  
  return true; // Keep message channel open
});
