import type { ProtocolMap } from '@core/protocol';
import { PermissionService } from '@core/services';
import { logger } from '@core/utils/logger';
import { assertMessageType, ensureStorageDefaults, getStorageNumber, pickConfigSnapshot } from './utils';

export async function handleCheckPermission(
  request: unknown,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['check-permission']['req']>(request);
  logger.debug('Background', 'Checking permission for:', data.bvid, 'uploader:', data.uploaderName);

  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const service = new PermissionService(storage);
  const result = service.check(data.bvid, data.uploaderName, data.title);
  const config = storage.config;

  const twBreak = await chrome.storage.local.get('timeWindowBreakUntil');
  const breakUntil = getStorageNumber(twBreak?.timeWindowBreakUntil, 0);
  const now = Date.now();

  const bypassData = await chrome.storage.local.get('dailyBypassUntil');
  const bypassUntil = getStorageNumber(bypassData?.dailyBypassUntil, 0);
  const isBypassActive = now < bypassUntil;

  const isVirtuallyInWindow = now < breakUntil || isBypassActive;

  return {
    ...result,
    inReviewWindow: result.inReviewWindow || isVirtuallyInWindow,
    config: pickConfigSnapshot(config),
  };
}
