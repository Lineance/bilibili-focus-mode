import type { PermissionResult, ExtensionStorage } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';

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

  constructor(storage: ExtensionStorage = DEFAULT_STORAGE) {
    this.storage = storage;
  }

  check(bvid: string): PermissionResult {
    try {
      // Check Permanent Groups
      const inPermanent = this.storage.permanentGroups.some(group =>
        group.items.some(item => item.bvid === bvid)
      );
      if (inPermanent) {
        return { allowed: true, reason: 'PERMANENT' };
      }

      // Check Instant List
      const instantItem = this.storage.instantList.find(item => item.bvid === bvid);
      if (instantItem) {
        const now = Date.now();
        if (now < instantItem.expiresAt) {
          return { allowed: true, reason: 'INSTANT' };
        }
      }

      // Check Cooling List
      const coolingItem = this.storage.coolingList.find(item => item.bvid === bvid);
      if (coolingItem) {
        const now = Date.now();
        if (now < coolingItem.availableAt) {
          return { allowed: false, reason: 'COOLING_WAITING' };
        } else if (now < coolingItem.expiresAt) {
          return { allowed: true, reason: 'COOLING_AVAILABLE' };
        } else {
          return { allowed: false, reason: 'EXPIRED' };
        }
      }

      // Check Bankruptcy
      if (this.storage.debtAccount.bankruptcyEndTime) {
        const now = Date.now();
        if (now < this.storage.debtAccount.bankruptcyEndTime) {
          return { allowed: false, reason: 'BANKRUPTCY' };
        }
      }

      return { allowed: false, reason: 'NO_PERMISSION' };
    } catch (error) {
      console.error('[PermissionService]', error);
      throw new PermissionError('Failed to check permission', 'CHECK_FAILED');
    }
  }

  isInLimbo(bvid: string): boolean {
    return this.storage.limboList.some(item => item.bvid === bvid);
  }

  isInGhost(bvid: string): boolean {
    return this.storage.ghostList.some(item => item.bvid === bvid);
  }
}
