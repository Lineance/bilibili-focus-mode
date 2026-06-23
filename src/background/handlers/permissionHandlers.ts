import type { ProtocolMap } from '@core/protocol';
import { PermissionService } from '@core/services';
import { logger } from '@core/utils/logger';
import { assertMessageType, ensureStorageDefaults, getStorageNumber, pickConfigSnapshot } from './utils';

export async function handleCheckPermission(request: unknown): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['check-permission']['req']>(request);
  logger.debug('Background', 'Checking permission for:', data.bvid, 'uploader:', data.uploaderName);

  const allData = await chrome.storage.local.get([
    'config', 'permanentGroups', 'instantList', 'coolingList', 'limboList', 'ghostList',
    'allowedUploaders', 'debtAccount', 'timeWindowBreakUntil', 'dailyBypassUntil'
  ]);

  const storage = ensureStorageDefaults(allData);
  const service = new PermissionService(storage);
  const result = service.check(data.bvid, data.uploaderName, data.title);
  const config = storage.config;

  const now = Date.now();
  const breakUntil = getStorageNumber(allData.timeWindowBreakUntil, 0);
  const bypassUntil = getStorageNumber(allData.dailyBypassUntil, 0);
  const isBypassActive = now < bypassUntil;
  const isVirtuallyInWindow = now < breakUntil || isBypassActive;

  if (isBypassActive && !result.allowed && result.reason !== 'BANKRUPTCY') {
    return {
      allowed: true,
      reason: 'DAILY_BYPASS',
      inReviewWindow: result.inReviewWindow || isVirtuallyInWindow,
      videoTag: result.videoTag,
      config: pickConfigSnapshot(config),
    };
  }

  return {
    ...result,
    inReviewWindow: result.inReviewWindow || isVirtuallyInWindow,
    config: pickConfigSnapshot(config),
  };
}
