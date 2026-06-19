import { DEFAULT_STORAGE } from '@core/constants';
import type { ExtensionConfig, VideoMetadata } from '@core/types';
import { logger } from '@core/utils/logger';

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

  private handleLimboAutoPurge(): void {
    chrome.storage.local.get().then((storage) => {
      const config = (storage.config || DEFAULT_STORAGE.config) as ExtensionConfig;
      if (config.limboAutoPurgeHours <= 0) return;

      const cutoff = Date.now() - config.limboAutoPurgeHours * 60 * 60 * 1000;
      const limboList = (storage.limboList || []) as VideoMetadata[];
      const updatedLimboList = limboList.filter((item) => item.addedAt >= cutoff);

      if (updatedLimboList.length !== limboList.length) {
        chrome.storage.local.set({ limboList: updatedLimboList });
      }
    });
  }
}
