import { onMessage } from 'webext-bridge/background';
import { logger } from '@core/utils/logger';
import {
  handleCheckPermission,
  handleAddToLimbo,
  handleUpdateDebt,
  handleSyncDebt,
  handleVerifyFuse,
  handleApplyFuse,
  handleApplyTimeWindowFuse,
  handleVerifyTimeWindowFuse,
  handleWatchEnded,
  handleGetFullConfig,
  handleDailyBypass,
} from './handlers';

export function registerMessageHandlers(): void {
  onMessage('check-permission', async (message) => handleCheckPermission(message.data));
  onMessage('add-to-limbo', async (message) => handleAddToLimbo(message.data));
  onMessage('update-debt', async (message) => handleUpdateDebt(message.data));
  onMessage('sync-debt', async () => handleSyncDebt());
  onMessage('verify-fuse', async (message) => handleVerifyFuse(message.data));
  onMessage('apply-fuse', async (message) => handleApplyFuse(message.data));
  onMessage('apply-time-window-fuse', async () => handleApplyTimeWindowFuse());
  onMessage('verify-time-window-fuse', async (message) => handleVerifyTimeWindowFuse(message.data));
  onMessage('watch-ended', async (message) => handleWatchEnded(message.data));
  onMessage('get-full-config', async () => handleGetFullConfig());
  onMessage('daily-bypass', async () => handleDailyBypass());

  onMessage('open-options-page', async () => {
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
}
