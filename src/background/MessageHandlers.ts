import { onMessage } from 'webext-bridge/background';
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

const PLACEHOLDER_SENDER = { id: '' } as chrome.runtime.MessageSender;

export function registerMessageHandlers(): void {
  onMessage('check-permission', async (message) => handleCheckPermission(message.data, PLACEHOLDER_SENDER));
  onMessage('add-to-limbo', async (message) => handleAddToLimbo(message.data, PLACEHOLDER_SENDER));
  onMessage('update-debt', async (message) => handleUpdateDebt(message.data, PLACEHOLDER_SENDER));
  onMessage('sync-debt', async (message) => handleSyncDebt(message.data, PLACEHOLDER_SENDER));
  onMessage('verify-fuse', async (message) => handleVerifyFuse(message.data, PLACEHOLDER_SENDER));
  onMessage('apply-fuse', async (message) => handleApplyFuse(message.data, PLACEHOLDER_SENDER));
  onMessage('apply-time-window-fuse', async (message) => handleApplyTimeWindowFuse(message.data, PLACEHOLDER_SENDER));
  onMessage('verify-time-window-fuse', async (message) => handleVerifyTimeWindowFuse(message.data, PLACEHOLDER_SENDER));
  onMessage('watch-ended', async (message) => handleWatchEnded(message.data, PLACEHOLDER_SENDER));
  onMessage('get-full-config', async (message) => handleGetFullConfig(message.data, PLACEHOLDER_SENDER));
  onMessage('daily-bypass', async (message) => handleDailyBypass(message.data, PLACEHOLDER_SENDER));
}
