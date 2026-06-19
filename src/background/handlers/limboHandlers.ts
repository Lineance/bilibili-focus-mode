import type { ProtocolMap } from '@core/protocol';
import { logger } from '@core/utils/logger';
import { assertMessageType, ensureStorageDefaults } from './utils';

export async function handleAddToLimbo(
  request: unknown,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['add-to-limbo']['req']>(request);
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
}
