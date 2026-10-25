import { useSyncExternalStore } from 'react';
import { sendMessage } from 'webext-bridge/options';

import { NATIVE_STATUS_KEY, isNativeConnectionSnapshot, type NativeConnectionSnapshot } from '@core/nativeMessaging';
import { logger } from '@core/utils/logger';

let snapshot: NativeConnectionSnapshot = { state: 'disconnected', reason: null, monitor: null, updatedAt: 0 };
const listeners = new Set<() => void>();

function update(value: unknown): void {
  if (!isNativeConnectionSnapshot(value)) return;
  snapshot = value;
  for (const listener of listeners) listener();
}
function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>, area: string): void {
  if (area === 'local' && changes[NATIVE_STATUS_KEY]) update(changes[NATIVE_STATUS_KEY].newValue);
}
async function refresh(): Promise<void> {
  try {
    update(await sendMessage('native-monitor-status', { refresh: true }, 'background'));
  } catch (error) {
    logger.error('useNativeMonitor', 'Failed to query the native connection', error);
    update({ state: 'error', reason: '无法联系扩展后台，请重新加载扩展。', monitor: null, updatedAt: Date.now() });
  }
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    chrome.storage.onChanged.addListener(onStorageChanged);
    void refresh();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      chrome.storage.onChanged.removeListener(onStorageChanged);
      snapshot = { state: 'disconnected', reason: null, monitor: null, updatedAt: 0 };
    }
  };
}
function getSnapshot(): NativeConnectionSnapshot { return snapshot; }

/** Read live background state; persisted data from an old worker is not trusted on mount. */
export function useNativeMonitor(): { status: NativeConnectionSnapshot; refresh: () => Promise<void> } {
  const status = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { status, refresh };
}
