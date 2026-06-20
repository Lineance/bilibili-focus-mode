import { DEFAULT_GLOBAL_STATS } from '@core/constants';
import type { ProtocolMap } from '@core/protocol';
import { BehaviorLoggingService, FuseApplicationService, FuseService } from '@core/services';
import { TimeWindowService } from '@core/services/TimeWindowService';
import type { GlobalStats } from '@core/types';
import { assertMessageType, ensureStorageDefaults, getStorageNumber, getStorageString, normalizeBehaviorLog, resetQuotaIfNeeded } from './utils';

const TIME_WINDOW_FUSE_KEY = 'timeWindowFuse';
const TIME_WINDOW_FUSE_EXPIRES_KEY = 'timeWindowFuseExpiresAt';

export async function handleVerifyFuse(request: unknown): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['verify-fuse']['req']>(request);
  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;
  const service = new FuseApplicationService(config);
  const result = await service.verifyFuse(data.bvid, data.fuseCode);
  if (!result.ok) {
    return { success: false, message: result.error.message };
  }
  return { success: true, message: '熔断码验证成功，可以观看视频' };
}

export async function handleApplyFuse(request: unknown): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['apply-fuse']['req']>(request);
  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;
  const behaviorLog = resetQuotaIfNeeded(normalizeBehaviorLog(storage.behaviorLog));

  const twBreak = await chrome.storage.local.get('timeWindowBreakUntil');
  const breakUntil = getStorageNumber(twBreak?.timeWindowBreakUntil, 0);
  const now = Date.now();
  const hasActiveBreak = now < breakUntil;

  const timeWindowService = new TimeWindowService(config);
  const windowStatus = timeWindowService.checkTimeWindow();

  if (!windowStatus.isInWindow && !hasActiveBreak) {
    return { success: false, message: '当前不在审批时间窗口内，无法申请熔断' };
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

  if (!result.ok) {
    return { success: false, message: result.error.message };
  }

  const globalStats: GlobalStats = storage.globalStats || DEFAULT_GLOBAL_STATS;
  globalStats.fuseApplicationsTotal++;

  await chrome.storage.local.set({
    globalStats,
  });

  return {
    success: true,
    message: '熔断码申请成功',
    fuseCode: result.data.fuseCode,
    expiresAt: result.data.expiresAt,
  };
}

export async function handleApplyTimeWindowFuse(): Promise<unknown> {
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
}

export async function handleVerifyTimeWindowFuse(request: unknown): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['verify-time-window-fuse']['req']>(request);
  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;

  const storageData = await chrome.storage.local.get([TIME_WINDOW_FUSE_KEY, TIME_WINDOW_FUSE_EXPIRES_KEY]);
  const timeWindowFuseCode = getStorageString(storageData[TIME_WINDOW_FUSE_KEY], null);
  const timeWindowFuseExpiresAt = getStorageNumber(storageData[TIME_WINDOW_FUSE_EXPIRES_KEY], 0);

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
}
