import { ensureStorageDefaults, getStorageNumber, resetQuotaIfNeeded } from './utils';
import { logger } from '@core/utils/logger';

export async function handleDailyBypass(
  _message: unknown,
  _sender: chrome.runtime.MessageSender
): Promise<{ success: boolean; message: string; expiresAt?: number }> {
  try {
    const storage = ensureStorageDefaults(await chrome.storage.local.get());
    const config = storage.config;
    const now = Date.now();

    // Check if feature is enabled
    if (!config.dailyBypassEnabled) {
      return { success: false, message: '每日放行功能未启用' };
    }

    // Check if already has active bypass
    const bypassData = await chrome.storage.local.get('dailyBypassUntil');
    const bypassUntil = getStorageNumber(bypassData?.dailyBypassUntil, 0);
    if (now < bypassUntil) {
      return { success: false, message: '当前已有生效的放行', expiresAt: bypassUntil };
    }

    // Reset daily counter if needed
    const behaviorLog = resetQuotaIfNeeded(storage.behaviorLog);

    // Check daily quota
    if (behaviorLog.dailyBypassesUsedToday >= config.dailyBypassQuota) {
      return { success: false, message: `今日放行次数已用完（${config.dailyBypassQuota}次）` };
    }

    // Apply bypass
    const expiresAt = now + config.dailyBypassDurationMinutes * 60 * 1000;
    const updatedBehaviorLog = {
      ...behaviorLog,
      dailyBypassesUsedToday: behaviorLog.dailyBypassesUsedToday + 1,
    };

    await chrome.storage.local.set({
      dailyBypassUntil: expiresAt,
      behaviorLog: updatedBehaviorLog,
    });

    logger.debug('BypassHandlers', `Daily bypass activated until ${new Date(expiresAt).toLocaleTimeString()}`);

    return {
      success: true,
      message: `已放行 ${config.dailyBypassDurationMinutes} 分钟，今日剩余 ${config.dailyBypassQuota - updatedBehaviorLog.dailyBypassesUsedToday} 次`,
      expiresAt,
    };
  } catch (error) {
    logger.error('BypassHandlers', 'Failed to apply daily bypass:', error);
    return { success: false, message: '操作失败，请重试' };
  }
}
