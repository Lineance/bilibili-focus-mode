import type { ProtocolMap } from '@core/protocol';
import type { BehaviorLogState } from '@core/types';
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

  await chrome.storage.local.set({ behaviorLog: updatedBehaviorLog });

  return { success: true, cooldownUntil };
}
