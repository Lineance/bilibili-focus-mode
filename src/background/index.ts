import { DEFAULT_STORAGE } from '@core/constants';
import type { ExtensionConfig } from '@core/types';
import { logger } from '@core/utils/logger';
import { AlarmHandler } from './AlarmHandler';
import { MessageRouter } from './MessageRouter';
import { registerMessageHandlers } from './MessageHandlers';

logger.debug('Background', 'Service worker started');

const alarmHandler = new AlarmHandler();
const messageRouter = new MessageRouter();

function getConfigFromStorage(storage: Record<string, unknown>): ExtensionConfig {
  return (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
}

function getNewConfigValue(newValue: unknown): typeof DEFAULT_STORAGE.config {
  return newValue as typeof DEFAULT_STORAGE.config;
}

// Initialize storage on install
chrome.runtime.onInstalled.addListener((details) => {
  logger.debug('Background', 'Extension installed:', details.reason);

  if (details.reason === 'install') {
    chrome.storage.local.set(DEFAULT_STORAGE).then(() => {
      logger.debug('Background', 'Default storage initialized');
      alarmHandler.scheduleLimboReviewReminder(DEFAULT_STORAGE.config.limboReviewTime);
      alarmHandler.scheduleLimboAutoPurge(DEFAULT_STORAGE.config.limboAutoPurgeHours);
      alarmHandler.scheduleCoolingCleanup();
    });
  }
});

// Set up alarm event listener
alarmHandler.listen();

// Register webext-bridge message handlers
registerMessageHandlers();

// Register chrome.runtime.onMessage handlers
messageRouter.register('openOptionsPage', async () => {
  logger.debug('Background', 'Opening options page');
  return new Promise((resolve) => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/manager/index.html')
    }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Error opening options page:', chrome.runtime.lastError);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        logger.debug('Background', 'Options page opened in tab:', tab?.id);
        resolve({ success: true, tabId: tab?.id });
      }
    });
  });
});

messageRouter.listen();

// Schedule initial alarms from stored config
chrome.storage.local.get('config').then((storage) => {
  const config = getConfigFromStorage(storage);
  const limboReviewTime = config.limboReviewTime || DEFAULT_STORAGE.config.limboReviewTime;
  const limboAutoPurgeHours = config.limboAutoPurgeHours ?? DEFAULT_STORAGE.config.limboAutoPurgeHours;
  alarmHandler.scheduleLimboReviewReminder(limboReviewTime);
  alarmHandler.scheduleLimboAutoPurge(limboAutoPurgeHours);
  alarmHandler.scheduleCoolingCleanup();
});

// Re-schedule alarms when config changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.config?.newValue) return;
  const newConfig = getNewConfigValue(changes.config.newValue);
  alarmHandler.scheduleLimboReviewReminder(newConfig.limboReviewTime);
  alarmHandler.scheduleLimboAutoPurge(newConfig.limboAutoPurgeHours);
});

// External message handler for extension detection
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
