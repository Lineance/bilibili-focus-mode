import type { ProtocolMap } from '@core/protocol';
import { PermissionService } from '@core/services';
import { logger } from '@core/utils/logger';
import { assertMessageType, ensureStorageDefaults, getStorageNumber, pickConfigSnapshot } from './utils';

export async function handleCheckPermission(request: unknown): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['check-permission']['req']>(request);
  logger.debug('Background', 'Checking permission for:', data.bvid, 'uploader:', data.uploaderName);

  const allData = await chrome.storage.local.get([
    'config', 'permanentGroups', 'allowedUploaders', 'debtAccount', 'dailyBypassUntil'
  ]);

  const storage = ensureStorageDefaults(allData);
  const service = new PermissionService(storage);
  const result = service.check(data.bvid, data.uploaderName, data.title);
  const config = storage.config;

  const now = Date.now();
  const bypassUntil = getStorageNumber(allData.dailyBypassUntil, 0);
  const isBypassActive = now < bypassUntil;

  if (isBypassActive && !result.allowed && result.reason !== 'BANKRUPTCY') {
    return {
      allowed: true,
      reason: 'DAILY_BYPASS',
      videoTag: result.videoTag,
      config: pickConfigSnapshot(config),
    };
  }

  return {
    ...result,
    config: pickConfigSnapshot(config),
  };
}
