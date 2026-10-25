import { DEFAULT_STORAGE } from '@core/constants';
import { logger } from '@core/utils/logger';
import { registerMessageHandlers } from './MessageHandlers';
import { NativeMessagingService } from './NativeMessagingService';

logger.debug('Background', 'Service worker started');

const nativeService = new NativeMessagingService();

chrome.runtime.onInstalled.addListener(async (details) => {
  logger.debug('Background', 'Extension installed:', details.reason);

  if (details.reason === 'install') {
    await chrome.storage.local.set(DEFAULT_STORAGE);
    logger.debug('Background', 'Default storage initialized');
    return;
  }

  if (details.reason === 'update') {
    const storage = await chrome.storage.local.get();
    const currentVersion = (storage as Record<string, unknown>).version as number || 0;

    if (currentVersion < 4) {
      await chrome.storage.local.set({
        ...DEFAULT_STORAGE,
        ...storage,
        version: 4,
      });
    }

    logger.debug('Background', `Migrated from version ${currentVersion} to current`);
  }
});

registerMessageHandlers();
nativeService.start();

// External message handler for extension detection.
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  logger.debug('Background', 'External message received:', request, 'from:', sender.id);

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

  return true;
});
