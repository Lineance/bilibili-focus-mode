import { DEFAULT_STORAGE } from '@core/constants';
import type { ExtensionStorage, PermissionResult, VideoTag } from '@core/types';
import { KeywordRule } from './KeywordRule';

export class PermissionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class PermissionService {
  private storage: ExtensionStorage;
  private keywordRule: KeywordRule;

  constructor(storage: ExtensionStorage = DEFAULT_STORAGE) {
    this.storage = storage;
    this.keywordRule = new KeywordRule(storage.config.keywordRules);
  }

  check(bvid: string, uploaderName?: string, title?: string): PermissionResult & {
    uploaderAllowed?: boolean;
    videoTag?: VideoTag;
  } {
    try {
      const tagMap = new Map<string, VideoTag>();
      for (const group of this.storage.permanentGroups) {
        for (const item of group.items) tagMap.set(item.bvid, item.tag);
      }

      const resolvedTag = tagMap.get(bvid) || 'ENTERTAINMENT';
      const context = { videoTag: resolvedTag };

      const permanentResult = this.checkPermanentGroup(bvid);
      if (permanentResult) return { ...permanentResult, ...context };

      // Permanent access remains available during bankruptcy. Other videos are
      // restricted unless they are learning-tagged content that can repay debt.
      const bankruptcyResult = this.checkBankruptcy();
      if (bankruptcyResult) {
        const videoTag = tagMap.get(bvid) ||
          (title ? this.keywordRule.check(title) : null) ||
          'ENTERTAINMENT';

        if (videoTag !== 'LEARNING') {
          return { ...bankruptcyResult, ...context, videoTag };
        }
      }

      if (title) {
        const keywordResult = this.checkKeywordRules(title);
        if (keywordResult) {
          return { ...keywordResult, ...context, videoTag: keywordResult.videoTag || resolvedTag };
        }
      }

      if (uploaderName) {
        const uploaderResult = this.checkUploaderAllowlist(uploaderName);
        if (uploaderResult) {
          return {
            ...uploaderResult.result,
            ...context,
            uploaderAllowed: true,
            videoTag: uploaderResult.tag || resolvedTag,
          };
        }
      }

      return { allowed: false, reason: 'NO_PERMISSION', ...context };
    } catch (error) {
      console.error('[PermissionService]', error);
      throw new PermissionError('Failed to check permission', 'CHECK_FAILED');
    }
  }

  private checkPermanentGroup(bvid: string): PermissionResult | null {
    return this.storage.permanentGroups.some((group) => group.items.some((item) => item.bvid === bvid))
      ? { allowed: true, reason: 'PERMANENT' }
      : null;
  }

  private checkKeywordRules(title: string): (PermissionResult & { videoTag?: VideoTag }) | null {
    if (!this.storage.config.keywordRules?.enabled) return null;
    const matchedTag = this.keywordRule.check(title);
    return matchedTag
      ? { allowed: true, reason: 'KEYWORD', videoTag: matchedTag }
      : null;
  }

  private checkUploaderAllowlist(uploaderName: string): { result: PermissionResult; tag?: VideoTag } | null {
    const found = this.storage.allowedUploaders?.find((uploader) => uploader.name === uploaderName);
    return found ? { result: { allowed: true, reason: 'PERMANENT' }, tag: found.tag } : null;
  }

  private checkBankruptcy(): PermissionResult | null {
    const endTime = this.storage.debtAccount?.bankruptcyEndTime;
    return this.storage.config.debtEnabled && endTime && Date.now() < endTime
      ? { allowed: false, reason: 'BANKRUPTCY' }
      : null;
  }
}
