import { DEFAULT_STORAGE } from '@core/constants';
import type { ExtensionConfig } from '@core/types';
import { logger } from '@core/utils/logger';
import { registerMessageHandlers } from './MessageHandlers';
import { NativeMessagingService } from './NativeMessagingService';

const STORAGE_VERSION = 4;
const LEGACY_STORAGE_KEYS = [
  'limboList',
  'instantList',
  'timeWindowBreakUntil',
  'timeWindowFuse',
  'timeWindowFuseExpiresAt',
];
const LEGACY_CONFIG_KEYS = [
  'timeWindowEnabled',
  'windowStart',
  'windowEnd',
  'limboCapacity',
  'limboReviewTime',
  'limboAutoPurgeHours',
  'instantDurationHours',
  'instantBreakFuse',
  'baseFuseLength',
  'maxFuseLength',
  'bankruptcyOverrideMaxFuse',
  'dynamicFuseEnabled',
  'dailyInstantQuota',
  'themeEnhancement',
];

logger.debug('Background', 'Service worker started');

const nativeService = new NativeMessagingService();

export async function migrateStorage(storage: Record<string, unknown>): Promise<void> {
  const rawConfig = (storage.config && typeof storage.config === 'object')
    ? { ...(storage.config as Record<string, unknown>) }
    : {};
  for (const key of LEGACY_CONFIG_KEYS) delete rawConfig[key];

  const config = {
    ...DEFAULT_STORAGE.config,
    ...rawConfig,
  } as ExtensionConfig;

  await chrome.storage.local.set({
    ...DEFAULT_STORAGE,
    ...storage,
    config,
    version: STORAGE_VERSION,
  });
  await chrome.storage.local.remove(LEGACY_STORAGE_KEYS);
}

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

    if (currentVersion < STORAGE_VERSION) {
      await migrateStorage(storage as Record<string, unknown>);
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
