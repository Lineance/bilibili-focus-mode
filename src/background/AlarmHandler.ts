import { DEFAULT_STORAGE } from '@core/constants';
import type { CoolingItem, ExtensionConfig, GhostItem, VideoMetadata } from '@core/types';
import { logger } from '@core/utils/logger';

function getConfigFromStorage(storage: Record<string, unknown>): ExtensionConfig {
  return (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
}

function getLimboListFromStorage(storage: Record<string, unknown>): VideoMetadata[] {
  return (storage.limboList || []) as VideoMetadata[];
}

export class AlarmHandler {
  listen(): void {
    chrome.alarms.onAlarm.addListener((alarm) => {
      logger.debug('Background', 'Alarm triggered:', alarm.name);

      if (alarm.name === 'limbo-review-reminder') {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'Bilibili Focus Mode',
          message: 'Time to review your Limbo list!',
        });
      }

      if (alarm.name === 'limbo-auto-purge') {
        this.handleLimboAutoPurge();
      }

      if (alarm.name === 'cooling-cleanup') {
        this.handleCoolingCleanup();
      }

      if (alarm.name === 'ghost-cleanup') {
        this.handleGhostCleanup();
      }
    });
  }

  scheduleLimboReviewReminder(timeString: string): void {
    const [hour, minute] = timeString.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);

    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }

    chrome.alarms.create('limbo-review-reminder', {
      when: next.getTime(),
      periodInMinutes: 24 * 60,
    });
  }

  scheduleLimboAutoPurge(hours: number): void {
    if (hours <= 0) {
      chrome.alarms.clear('limbo-auto-purge');
      return;
    }

    chrome.alarms.create('limbo-auto-purge', {
      when: Date.now() + 60 * 1000,
      periodInMinutes: 60,
    });
  }

  scheduleCoolingCleanup(): void {
    chrome.alarms.create('cooling-cleanup', {
      periodInMinutes: 360,
    });
  }

  scheduleGhostCleanup(): void {
    chrome.alarms.create('ghost-cleanup', { periodInMinutes: 360 });
  }

  private handleLimboAutoPurge(): void {
    chrome.storage.local.get().then((storage) => {
      const config = getConfigFromStorage(storage);
      if (config.limboAutoPurgeHours <= 0) return;

      const cutoff = Date.now() - config.limboAutoPurgeHours * 60 * 60 * 1000;
      const limboList = getLimboListFromStorage(storage);
      const updatedLimboList = limboList.filter((item) => item.addedAt >= cutoff);

      if (updatedLimboList.length !== limboList.length) {
        chrome.storage.local.set({ limboList: updatedLimboList });
      }
    });
  }

  private handleCoolingCleanup(): void {
    chrome.storage.local.get().then((storage) => {
      const coolingList = (storage.coolingList || []) as CoolingItem[];
      const now = Date.now();

      const cleanupThreshold = now - 24 * 60 * 60 * 1000;
      const updatedCoolingList = coolingList.filter(item =>
        item.expiresAt > cleanupThreshold
      );

      if (updatedCoolingList.length !== coolingList.length) {
        chrome.storage.local.set({ coolingList: updatedCoolingList });
        logger.debug('AlarmHandler', `Cleaned up ${coolingList.length - updatedCoolingList.length} expired cooling items`);
      }
    });
  }

  private handleGhostCleanup(): void {
    chrome.storage.local.get().then((storage) => {
      const ghostList = (storage.ghostList || []) as GhostItem[];
      const now = Date.now();

      const updatedGhostList = ghostList.filter(item => item.canResurrectUntil > now);

      if (updatedGhostList.length !== ghostList.length) {
        chrome.storage.local.set({ ghostList: updatedGhostList });
        logger.debug('AlarmHandler', `Cleaned up ${ghostList.length - updatedGhostList.length} expired ghosts`);
      }
    });
  }
}
