import type { CoolingItem, GhostItem, VideoMetadata } from '@core/types';

export interface CoolingTransition {
  type: 'to_available' | 'to_expired' | 'to_ghost';
  item: CoolingItem;
  newItem?: GhostItem;
}

export class CoolingTransitionService {
  private readonly ghostLifespanDays: number;

  constructor(ghostLifespanDays: number) {
    this.ghostLifespanDays = ghostLifespanDays;
  }

  /**
   * Check and process cooling item transitions
   * Returns transitions that occurred
   */
  processTransitions(coolingList: readonly CoolingItem[]): {
    updatedCoolingList: CoolingItem[];
    newGhostList: GhostItem[];
    transitions: CoolingTransition[];
  } {
    const now = Date.now();
    const updatedCoolingList: CoolingItem[] = [];
    const newGhostList: GhostItem[] = [];
    const transitions: CoolingTransition[] = [];

    for (const item of coolingList) {
      if (now >= item.expiresAt) {
        // Transition to ghost
        const ghostItem = this.createGhostItem(item);
        newGhostList.push(ghostItem);
        transitions.push({
          type: 'to_ghost',
          item,
          newItem: ghostItem,
        });
      } else if (now >= item.availableAt && !item.availableAt) {
        // Just became available (this shouldn't happen as availableAt is set on creation)
        transitions.push({
          type: 'to_available',
          item,
        });
        updatedCoolingList.push(item);
      } else {
        // Still in cooling or available period
        updatedCoolingList.push(item);
      }
    }

    return {
      updatedCoolingList,
      newGhostList,
      transitions,
    };
  }

  /**
   * Check if a cooling item is in waiting period
   */
  isInWaitingPeriod(item: CoolingItem): boolean {
    return Date.now() < item.availableAt;
  }

  /**
   * Check if a cooling item is in available period
   */
  isInAvailablePeriod(item: CoolingItem): boolean {
    const now = Date.now();
    return now >= item.availableAt && now < item.expiresAt;
  }

  /**
   * Check if a cooling item has expired
   */
  isExpired(item: CoolingItem): boolean {
    return Date.now() >= item.expiresAt;
  }

  /**
   * Get time until item becomes available
   */
  getTimeUntilAvailable(item: CoolingItem): number {
    return Math.max(0, item.availableAt - Date.now());
  }

  /**
   * Get remaining time in available period
   */
  getRemainingAvailableTime(item: CoolingItem): number {
    const now = Date.now();
    if (now < item.availableAt) return 0;
    return Math.max(0, item.expiresAt - now);
  }

  /**
   * Get visual state for UI
   */
  getVisualState(item: CoolingItem): 'cooling' | 'early' | 'expiring' | 'expired' {
    const now = Date.now();

    if (now < item.availableAt) {
      return 'cooling';
    }

    if (now >= item.expiresAt) {
      return 'expired';
    }

    // Calculate progress through available period
    const availableDuration = item.expiresAt - item.availableAt;
    const elapsedInAvailable = now - item.availableAt;
    const progress = elapsedInAvailable / availableDuration;

    if (progress < 0.5) {
      return 'early';
    } else {
      return 'expiring';
    }
  }

  private createGhostItem(coolingItem: CoolingItem): GhostItem {
    const now = Date.now();
    const metadata: VideoMetadata = {
      bvid: coolingItem.bvid,
      title: coolingItem.title,
      uploader: coolingItem.uploader,
      coverUrl: coolingItem.coverUrl,
      tag: coolingItem.tag,
      addedAt: coolingItem.addedAt,
    };

    return {
      ...metadata,
      diedAt: now,
      canResurrectUntil: now + this.ghostLifespanDays * 24 * 60 * 60 * 1000,
    };
  }
}
