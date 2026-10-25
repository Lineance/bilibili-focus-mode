import { onMessage } from 'webext-bridge/background';

import { NATIVE_RECOVERY_ALARM, NATIVE_STATUS_KEY, type NativeConnectionSnapshot } from '@core/nativeMessaging';
import { logger } from '@core/utils/logger';
import { NativeMessagingClient } from './NativeMessagingClient';

function messagingEnabled(config: unknown): boolean {
  return typeof config === 'object' && config !== null
    && 'nativeMessagingEnabled' in config && config.nativeMessagingEnabled === true;
}

/** Restores the native channel on every worker start and through a durable alarm. */
export class NativeMessagingService {
  private enabled = false;
  private revision = 0;

  constructor(private readonly client = new NativeMessagingClient()) {}

  /** Register synchronously so the event that wakes a cold worker is not lost. */
  start(): void {
    this.client.on('connection-state', () => this.persist());
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.config) return;
      ++this.revision;
      this.apply(messagingEnabled(changes.config.newValue));
    });
    chrome.runtime.onStartup.addListener(() => { void this.loadConfig(); });
    chrome.runtime.onInstalled.addListener(() => { void this.loadConfig(); });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === NATIVE_RECOVERY_ALARM) void this.loadConfig();
    });
    onMessage('native-monitor-status', ({ data }) => {
      if (typeof data === 'object' && data !== null && 'refresh' in data && data.refresh === true) {
        if (this.enabled) this.client.connect();
        this.client.send({ type: 'status-request' });
      }
      return this.getSnapshot();
    });
    void this.loadConfig();
  }

  /** Exposed to the manager through webext-bridge, never through another Port. */
  getSnapshot(): NativeConnectionSnapshot {
    return this.client.getSnapshot();
  }

  private async loadConfig(): Promise<void> {
    const revision = ++this.revision;
    try {
      const storage = await chrome.storage.local.get('config');
      if (revision !== this.revision) return;
      this.apply(messagingEnabled(storage.config));
    } catch (error) {
      logger.error('NativeMessagingService', 'Failed to read native connection configuration', error);
    }
  }

  private apply(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) this.client.connect();
    else this.client.disconnect();
    this.persist();
    void this.updateAlarm(enabled);
  }

  private async updateAlarm(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        // Chrome 105 supports one-minute periodic alarms. Timers are only the
        // fast path while a worker is still running after a native disconnect.
        await chrome.alarms.create(NATIVE_RECOVERY_ALARM, { periodInMinutes: 1 });
        if (!this.enabled) await chrome.alarms.clear(NATIVE_RECOVERY_ALARM);
      } else {
        await chrome.alarms.clear(NATIVE_RECOVERY_ALARM);
      }
    } catch (error) {
      logger.error('NativeMessagingService', 'Failed to update native recovery alarm', error);
    }
  }

  private persist(): void {
    void Promise.resolve(chrome.storage.local.set({ [NATIVE_STATUS_KEY]: this.client.getSnapshot() }))
      .catch((error: unknown) => logger.error('NativeMessagingService', 'Failed to save native monitor status', error));
  }
}
