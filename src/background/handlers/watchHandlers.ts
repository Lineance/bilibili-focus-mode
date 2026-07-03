import type { ProtocolMap } from '@core/protocol';
import type { BehaviorLogState, WatchRecord } from '@core/types';
import { assertMessageType, ensureStorageDefaults, normalizeBehaviorLog } from './utils';

export async function handleWatchEnded(request: unknown): Promise<unknown> {
  const data = assertMessageType<ProtocolMap['watch-ended']['req']>(request);
  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;
  const behaviorLog = normalizeBehaviorLog(storage.behaviorLog);

  const cooldownMinutes = config.postWatchCooldownMinutes;
  const cooldownUntil = cooldownMinutes > 0
    ? data.endedAt + cooldownMinutes * 60 * 1000
    : null;

  const updatedBehaviorLog: BehaviorLogState = {
    ...behaviorLog,
    lastWatchEnd: data.endedAt,
    currentCooldownUntil: cooldownUntil,
  };

  // Update watch history with metadata if available
  if (data.title || data.uploader || data.tag) {
    const watchHistoryStorage = await chrome.storage.local.get('watchHistory');
    const watchHistory: WatchRecord[] = (watchHistoryStorage.watchHistory as WatchRecord[] | undefined) || [];
    const existingIndex = watchHistory.findIndex((r) => r.bvid === data.bvid);
    if (existingIndex >= 0) {
      const existing = watchHistory[existingIndex];
      watchHistory[existingIndex] = {
        ...existing,
        title: data.title || existing.title,
        uploader: data.uploader || existing.uploader,
        tag: data.tag || existing.tag,
      };
      await chrome.storage.local.set({ behaviorLog: updatedBehaviorLog, watchHistory });
      return { success: true, cooldownUntil };
    }
  }

  await chrome.storage.local.set({ behaviorLog: updatedBehaviorLog });

  return { success: true, cooldownUntil };
}
