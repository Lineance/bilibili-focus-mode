import { MS_PER_DAY } from '@core/constants';
import type { ExtensionConfig } from '@core/types';

export interface TimeWindowStatus {
  isInWindow: boolean;
  windowStart: Date;
  windowEnd: Date;
  timeUntilWindow: number; // milliseconds
  timeRemainingInWindow: number; // milliseconds
}

export class TimeWindowService {
  private config: ExtensionConfig;

  constructor(config: ExtensionConfig) {
    this.config = config;
  }

  /**
   * Check if current time is within the allowed window
   */
  checkTimeWindow(): TimeWindowStatus {
    if (!this.config.timeWindowEnabled) {
      return {
        isInWindow: true,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + MS_PER_DAY),
        timeUntilWindow: 0,
        timeRemainingInWindow: Infinity,
      };
    }

    const now = new Date();
    const [startHour, startMinute] = this.config.windowStart.split(':').map(Number);
    const [endHour, endMinute] = this.config.windowEnd.split(':').map(Number);

    // Create today's window times
    let windowStart = new Date(now);
    windowStart.setHours(startHour, startMinute, 0, 0);

    let windowEnd = new Date(now);
    windowEnd.setHours(endHour, endMinute, 0, 0);

    // Handle overnight window (e.g., 23:00 - 01:00)
    const isOvernightWindow = endHour < startHour || (endHour === startHour && endMinute < startMinute);
    
    if (isOvernightWindow) {
      // Window spans midnight
      if (now.getHours() < startHour || (now.getHours() === startHour && now.getMinutes() < startMinute)) {
        // Current time is before start (e.g., 00:30 when window is 23:00-01:00)
        // Window started yesterday
        windowStart.setDate(windowStart.getDate() - 1);
      } else {
        // Current time is at or after start (e.g., 23:30 when window is 23:00-01:00)
        // Window ends tomorrow
        windowEnd.setDate(windowEnd.getDate() + 1);
      }
    } else if (now > windowEnd) {
      // Normal window, but we're after it - move to next day
      windowStart.setDate(windowStart.getDate() + 1);
      windowEnd.setDate(windowEnd.getDate() + 1);
    }

    const isInWindow = now >= windowStart && now <= windowEnd;
    const timeUntilWindow = isInWindow ? 0 : windowStart.getTime() - now.getTime();
    const timeRemainingInWindow = isInWindow ? windowEnd.getTime() - now.getTime() : 0;

    return {
      isInWindow,
      windowStart,
      windowEnd,
      timeUntilWindow,
      timeRemainingInWindow,
    };
  }

  /**
   * Check if instant application is allowed (can break time window with fuse)
   */
  canBreakWindow(): boolean {
    return this.config.instantBreakFuse;
  }
}
