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

export function registerMessageHandlers(): void {
  onMessage('check-permission', async (message) => handleCheckPermission(message.data, {} as chrome.runtime.MessageSender));
  onMessage('add-to-limbo', async (message) => handleAddToLimbo(message.data, {} as chrome.runtime.MessageSender));
  onMessage('update-debt', async (message) => handleUpdateDebt(message.data, {} as chrome.runtime.MessageSender));
  onMessage('sync-debt', async (message) => handleSyncDebt(message.data, {} as chrome.runtime.MessageSender));
  onMessage('verify-fuse', async (message) => handleVerifyFuse(message.data, {} as chrome.runtime.MessageSender));
  onMessage('apply-fuse', async (message) => handleApplyFuse(message.data, {} as chrome.runtime.MessageSender));
  onMessage('apply-time-window-fuse', async (message) => handleApplyTimeWindowFuse(message.data, {} as chrome.runtime.MessageSender));
  onMessage('verify-time-window-fuse', async (message) => handleVerifyTimeWindowFuse(message.data, {} as chrome.runtime.MessageSender));
  onMessage('watch-ended', async (message) => handleWatchEnded(message.data, {} as chrome.runtime.MessageSender));
  onMessage('get-full-config', async (message) => handleGetFullConfig(message.data, {} as chrome.runtime.MessageSender));
  onMessage('daily-bypass', async (message) => handleDailyBypass(message.data, {} as chrome.runtime.MessageSender));
}
