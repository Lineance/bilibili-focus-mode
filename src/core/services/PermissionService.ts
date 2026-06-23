import { DEFAULT_STORAGE } from '@core/constants';
import type { ExtensionStorage, PermissionResult, VideoTag } from '@core/types';
import { KeywordRule } from './KeywordRule';
import { TimeWindowService } from './TimeWindowService';

export class PermissionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class PermissionService {
  private storage: ExtensionStorage;
  private timeWindowService: TimeWindowService;
  private keywordRule: KeywordRule;

  constructor(storage: ExtensionStorage = DEFAULT_STORAGE) {
    this.storage = storage;
    this.timeWindowService = new TimeWindowService(storage.config);
    this.keywordRule = new KeywordRule(storage.config.keywordRules);
  }

  check(bvid: string, uploaderName?: string, title?: string): PermissionResult & {
    inReviewWindow: boolean;
    timeUntilWindow: number;
    uploaderAllowed?: boolean;
    videoTag?: VideoTag;
  } {
    try {
      const tagMap = new Map<string, VideoTag>();
      for (const g of this.storage.permanentGroups) {
        for (const i of g.items) tagMap.set(i.bvid, i.tag);
      }
      for (const i of this.storage.instantList) tagMap.set(i.bvid, i.tag);
      for (const i of this.storage.coolingList) tagMap.set(i.bvid, i.tag);
      for (const i of this.storage.limboList) tagMap.set(i.bvid, i.tag);
      for (const i of this.storage.ghostList) tagMap.set(i.bvid, i.tag);

      const resolvedTag = tagMap.get(bvid) || 'ENTERTAINMENT';
      const { isInWindow: inReviewWindow, timeUntilWindow } = this.timeWindowService.checkTimeWindow();
      const ctx = { inReviewWindow, timeUntilWindow, videoTag: resolvedTag };

      const permanentResult = this.checkPermanentGroup(bvid);
      if (permanentResult) return { ...permanentResult, ...ctx };

      // Check bankruptcy override BEFORE bankruptcy block (Issue #2)
      const bankruptcyOverride = this.checkBankruptcyOverride(bvid);
      if (bankruptcyOverride) return { ...bankruptcyOverride, ...ctx };

      // During bankruptcy, allow learning-tagged videos for debt repayment (Issue #1)
      const bankruptcyResult = this.checkBankruptcy();
      if (bankruptcyResult) {
        const videoTag = tagMap.get(bvid) ||
          (title ? this.keywordRule.check(title) : null) ||
          'ENTERTAINMENT';

        if (videoTag === 'LEARNING') {
          // Allow learning during bankruptcy — continue to normal permission checks
        } else {
          return { ...bankruptcyResult, ...ctx, videoTag };
        }
      }

      if (title) {
        const keywordResult = this.checkKeywordRules(title);
        if (keywordResult) {
          // 使用关键词规则返回的videoTag，如果有的话
          const keywordTag = keywordResult.videoTag || resolvedTag;
          return { ...keywordResult, ...ctx, videoTag: keywordTag };
        }
      }

      if (uploaderName) {
        const uploaderResult = this.checkUploaderAllowlist(uploaderName);
        if (uploaderResult) return { ...uploaderResult.result, ...ctx, uploaderAllowed: true, videoTag: uploaderResult.tag || resolvedTag };
      }

      const instantResult = this.checkInstantList(bvid);
      if (instantResult) return { ...instantResult, ...ctx };

      const coolingResult = this.checkCoolingList(bvid);
      if (coolingResult) return { ...coolingResult, ...ctx };

      return { allowed: false, reason: 'NO_PERMISSION', ...ctx };
    } catch (error) {
      console.error('[PermissionService]', error);
      throw new PermissionError('Failed to check permission', 'CHECK_FAILED');
    }
  }

  private checkPermanentGroup(bvid: string): PermissionResult | null {
    return this.storage.permanentGroups.some(g => g.items.some(i => i.bvid === bvid))
      ? { allowed: true, reason: 'PERMANENT' } : null;
  }

  private checkKeywordRules(title: string): (PermissionResult & { videoTag?: VideoTag }) | null {
    if (!this.storage.config.keywordRules?.enabled) return null;
    const matchedTag = this.keywordRule.check(title);
    return matchedTag
      ? { allowed: true, reason: 'KEYWORD', videoTag: matchedTag } : null;
  }

  private checkUploaderAllowlist(uploaderName: string): { result: PermissionResult; tag?: VideoTag } | null {
    const found = this.storage.allowedUploaders?.find(u => u.name === uploaderName);
    return found ? { result: { allowed: true, reason: 'PERMANENT' }, tag: found.tag } : null;
  }

  private checkBankruptcyOverride(bvid: string): PermissionResult | null {
    const item = this.storage.instantList.find(
      i => i.bvid === bvid &&
           i.usedFuse &&
           i.bankruptcyOverride &&
           Date.now() < i.expiresAt
    );
    return item ? { allowed: true, reason: 'INSTANT' } : null;
  }

  private checkBankruptcy(): PermissionResult | null {
    const endTime = this.storage.debtAccount?.bankruptcyEndTime;
    return this.storage.config.debtEnabled && endTime && Date.now() < endTime
      ? { allowed: false, reason: 'BANKRUPTCY' } : null;
  }

  private checkInstantList(bvid: string): PermissionResult | null {
    const item = this.storage.instantList.find(i => i.bvid === bvid);
    return item && Date.now() < item.expiresAt ? { allowed: true, reason: 'INSTANT' } : null;
  }

  private checkCoolingList(bvid: string): PermissionResult | null {
    const item = this.storage.coolingList.find(i => i.bvid === bvid);
    if (!item) return null;
    const now = Date.now();
    if (now < item.availableAt) return { allowed: false, reason: 'COOLING_WAITING' };
    if (now < item.expiresAt) return { allowed: true, reason: 'COOLING_AVAILABLE' };
    return { allowed: false, reason: 'EXPIRED' };
  }

}
