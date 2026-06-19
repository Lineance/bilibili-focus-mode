import { DEFAULT_STORAGE } from '@core/constants';
import type { ExtensionStorage, PermissionResult, VideoTag } from '@core/types';
import { KeywordRule } from './KeywordRule';
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
  check(bvid: string, uploaderName?: string, title?: string): PermissionResult & {
    inReviewWindow: boolean;
    timeUntilWindow: number;
    uploaderAllowed?: boolean;
    videoTag?: VideoTag;
  } {
    try {
      const resolvedTag = this.getVideoTag(bvid) || 'ENTERTAINMENT';
      // Check time window status
      const windowStatus = this.timeWindowService.checkTimeWindow();
      const inReviewWindow = windowStatus.isInWindow;
      const timeUntilWindow = windowStatus.timeUntilWindow;

      // Check Permanent Groups FIRST - always allowed even during bankruptcy
      const inPermanent = this.storage.permanentGroups.some(group =>
        group.items.some(item => item.bvid === bvid)
      );
      if (inPermanent) {
        return {
          allowed: true,
          reason: 'PERMANENT',
          inReviewWindow,
          timeUntilWindow,
          videoTag: resolvedTag
        };
      }

      // Check Keyword Rules - auto-allow based on title keywords
      if (title && this.storage.config.keywordRules?.enabled) {
        const keywordRule = new KeywordRule(this.storage.config.keywordRules);
        const matchedTag = keywordRule.check(title);
        if (matchedTag) {
          return {
            allowed: true,
            reason: 'PERMANENT',
            inReviewWindow,
            timeUntilWindow,
            videoTag: matchedTag
          };
        }
      }

      // Check if uploader is in allowlist
      if (uploaderName && this.storage.allowedUploaders) {
        const allowedUploader = this.storage.allowedUploaders.find(u => u.name === uploaderName);
        if (allowedUploader) {
          return {
            allowed: true,
            reason: 'PERMANENT',
            inReviewWindow,
            timeUntilWindow,
            uploaderAllowed: true,
            videoTag: allowedUploader.tag
          };
        }
      }

      // Check Bankruptcy - blocks all new applications except permanent groups
      if (this.storage.config.debtEnabled && this.storage.debtAccount?.bankruptcyEndTime) {
        const now = Date.now();
        if (now < this.storage.debtAccount.bankruptcyEndTime) {
          return {
            allowed: false,
            reason: 'BANKRUPTCY',
            inReviewWindow,
            timeUntilWindow,
            videoTag: resolvedTag
          };
        }
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
            timeUntilWindow,
            videoTag: instantItem.tag
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
            timeUntilWindow,
            videoTag: coolingItem.tag
          };
        } else if (now < coolingItem.expiresAt) {
          return {
            allowed: true,
            reason: 'COOLING_AVAILABLE',
            inReviewWindow,
            timeUntilWindow,
            videoTag: coolingItem.tag
          };
        } else {
          return {
            allowed: false,
            reason: 'EXPIRED',
            inReviewWindow,
            timeUntilWindow,
            videoTag: coolingItem.tag
          };
        }
      }

      // No permission - video is in limbo or not processed
      return {
        allowed: false,
        reason: 'NO_PERMISSION',
        inReviewWindow,
        timeUntilWindow,
        videoTag: resolvedTag
      };
    } catch (error) {
      console.error('[PermissionService]', error);
      throw new PermissionError('Failed to check permission', 'CHECK_FAILED');
    }
  }

  private getVideoTag(bvid: string): VideoTag | undefined {
    const fromPermanent = this.storage.permanentGroups
      .flatMap(group => group.items)
      .find(item => item.bvid === bvid)?.tag;
    if (fromPermanent) return fromPermanent;

    const fromInstant = this.storage.instantList.find(item => item.bvid === bvid)?.tag;
    if (fromInstant) return fromInstant;

    const fromCooling = this.storage.coolingList.find(item => item.bvid === bvid)?.tag;
    if (fromCooling) return fromCooling;

    const fromLimbo = this.storage.limboList.find(item => item.bvid === bvid)?.tag;
    if (fromLimbo) return fromLimbo;

    const fromGhost = this.storage.ghostList.find(item => item.bvid === bvid)?.tag;
    return fromGhost;
  }
}
