import type { PermissionResult, ExtensionStorage } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';
import { TimeWindowService } from './TimeWindowService';

export class PermissionError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class PermissionService {
  private storage: ExtensionStorage;
  private timeWindowService: TimeWindowService;

  constructor(storage: ExtensionStorage = DEFAULT_STORAGE) {
    this.storage = storage;
    this.timeWindowService = new TimeWindowService(storage.config);
  }

  /**
   * Check if video can be watched
   * Returns permission result and review window status
   */
  check(bvid: string): PermissionResult & {
    inReviewWindow: boolean;
    timeUntilWindow: number;
  } {
    try {
      // Check time window status
      const windowStatus = this.timeWindowService.checkTimeWindow();
      const inReviewWindow = windowStatus.isInWindow;
      const timeUntilWindow = windowStatus.timeUntilWindow;

      // Check Permanent Groups - always allowed once approved
      const inPermanent = this.storage.permanentGroups.some(group =>
        group.items.some(item => item.bvid === bvid)
      );
      if (inPermanent) {
        return { 
          allowed: true, 
          reason: 'PERMANENT',
          inReviewWindow,
          timeUntilWindow
        };
      }

      // Check Instant List - allowed if not expired
      const instantItem = this.storage.instantList.find(item => item.bvid === bvid);
      if (instantItem) {
        const now = Date.now();
        if (now < instantItem.expiresAt) {
          return { 
            allowed: true, 
            reason: 'INSTANT',
            inReviewWindow,
            timeUntilWindow
          };
        }
      }

      // Check Cooling List - allowed if in available period
      const coolingItem = this.storage.coolingList.find(item => item.bvid === bvid);
      if (coolingItem) {
        const now = Date.now();
        if (now < coolingItem.availableAt) {
          return { 
            allowed: false, 
            reason: 'COOLING_WAITING',
            inReviewWindow,
            timeUntilWindow
          };
        } else if (now < coolingItem.expiresAt) {
          return { 
            allowed: true, 
            reason: 'COOLING_AVAILABLE',
            inReviewWindow,
            timeUntilWindow
          };
        } else {
          return { 
            allowed: false, 
            reason: 'EXPIRED',
            inReviewWindow,
            timeUntilWindow
          };
        }
      }

      // Check Bankruptcy
      if (this.storage.debtAccount.bankruptcyEndTime) {
        const now = Date.now();
        if (now < this.storage.debtAccount.bankruptcyEndTime) {
          return { 
            allowed: false, 
            reason: 'BANKRUPTCY',
            inReviewWindow,
            timeUntilWindow
          };
        }
      }

      // No permission - video is in limbo or not processed
      return { 
        allowed: false, 
        reason: 'NO_PERMISSION',
        inReviewWindow,
        timeUntilWindow
      };
    } catch (error) {
      console.error('[PermissionService]', error);
      throw new PermissionError('Failed to check permission', 'CHECK_FAILED');
    }
  }

  /**
   * Check if current time is in review window
   */
  isInReviewWindow(): boolean {
    return this.timeWindowService.checkTimeWindow().isInWindow;
  }

  /**
   * Get time until next review window
   */
  getTimeUntilReviewWindow(): number {
    return this.timeWindowService.checkTimeWindow().timeUntilWindow;
  }

  isInLimbo(bvid: string): boolean {
    return this.storage.limboList.some(item => item.bvid === bvid);
  }

  isInGhost(bvid: string): boolean {
    return this.storage.ghostList.some(item => item.bvid === bvid);
  }
}
