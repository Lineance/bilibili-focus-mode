import type { GhostItem, CoolingItem, VideoMetadata, ExtensionConfig } from '@core/types';
import { ExpirationService } from './ExpirationService';
import { FuseService } from './FuseService';

export interface ResurrectionResult {
  success: boolean;
  message: string;
  coolingItem?: CoolingItem;
}

export class GhostResurrectionService {
  private config: ExtensionConfig;
  private expirationService: ExpirationService;
  private fuseService: FuseService;

  constructor(config: ExtensionConfig) {
    this.config = config;
    this.expirationService = new ExpirationService(
      config.coolingCooldownHours * (config.ghostDoublePenalty ? 2 : 1),
      config.coolingAvailableHours,
      config.instantDurationHours,
      config.ghostLifespanDays
    );
    this.fuseService = new FuseService(config);
  }

  /**
   * Check if a ghost item can be resurrected
   */
  canResurrect(ghostItem: GhostItem): { canResurrect: boolean; reason?: string } {
    const now = Date.now();

    if (now >= ghostItem.canResurrectUntil) {
      return {
        canResurrect: false,
        reason: '招魂期已过，该视频已彻底消失',
      };
    }

    if (ghostItem.resurrected) {
      return {
        canResurrect: false,
        reason: '该视频已被招魂过',
      };
    }

    return { canResurrect: true };
  }

  /**
   * Get resurrection requirements for a ghost item
   */
  getResurrectionRequirements(): {
    fuseLength: number;
    requiresRepentance: boolean;
    minRepentanceLength: number;
  } {
    return {
      fuseLength: this.config.ghostResurrectFuseLength,
      requiresRepentance: true,
      minRepentanceLength: 20,
    };
  }

  /**
   * Attempt to resurrect a ghost item
   */
  async resurrect(
    ghostItem: GhostItem,
    fuseCodeInput: string,
    repentanceReason: string
  ): Promise<ResurrectionResult> {
    // Check if can resurrect
    const canResurrectCheck = this.canResurrect(ghostItem);
    if (!canResurrectCheck.canResurrect) {
      return {
        success: false,
        message: canResurrectCheck.reason || '无法招魂',
      };
    }

    // Validate repentance reason
    if (!repentanceReason || repentanceReason.trim().length < 20) {
      return {
        success: false,
        message: '忏悔理由至少需要20个字',
      };
    }

    // Generate and verify fuse code
    const expectedFuseCode = this.fuseService.generateFuseCode(this.config.ghostResurrectFuseLength);
    const isValidFuse = this.fuseService.verifyFuseCode(fuseCodeInput, expectedFuseCode);

    if (!isValidFuse) {
      return {
        success: false,
        message: '熔断码错误，请重新输入',
      };
    }

    // Create metadata for cooling item
    const metadata: VideoMetadata = {
      bvid: ghostItem.bvid,
      title: ghostItem.title,
      uploader: ghostItem.uploader,
      coverUrl: ghostItem.coverUrl,
      tag: ghostItem.tag,
      addedAt: Date.now(),
    };

    // Create cooling item with double penalty if enabled
    const coolingItem = this.expirationService.createCoolingItem(metadata);

    // Mark ghost as resurrected
    const storage = await chrome.storage.local.get();
    const ghostList = (storage.ghostList || []) as GhostItem[];
    const updatedGhostList = ghostList.map((g) => {
      if (g.bvid === ghostItem.bvid) {
        return {
          ...g,
          resurrected: true,
          repentanceReason: repentanceReason.trim(),
        };
      }
      return g;
    });

    // Add to cooling list
    const coolingList = (storage.coolingList || []) as CoolingItem[];
    coolingList.push(coolingItem);

    // Update global stats
    const globalStats = storage.globalStats || { ghostResurrectionsTotal: 0 };
    globalStats.ghostResurrectionsTotal++;

    await chrome.storage.local.set({
      ghostList: updatedGhostList,
      coolingList,
      globalStats,
    });

    return {
      success: true,
      message: `招魂成功！视频已进入冷静期${this.config.ghostDoublePenalty ? '（双倍冷静期惩罚）' : ''}`,
      coolingItem,
    };
  }

  /**
   * Get remaining days for resurrection
   */
  getRemainingDays(ghostItem: GhostItem): number {
    const now = Date.now();
    const remainingMs = ghostItem.canResurrectUntil - now;
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  }

  /**
   * Check if ghost item is expired (can no longer be resurrected)
   */
  isExpired(ghostItem: GhostItem): boolean {
    return Date.now() >= ghostItem.canResurrectUntil;
  }

  /**
   * Get all resurrectable ghosts
   */
  async getResurrectableGhosts(): Promise<GhostItem[]> {
    const storage = await chrome.storage.local.get();
    const ghostList = (storage.ghostList || []) as GhostItem[];

    return ghostList.filter((ghost) => {
      const check = this.canResurrect(ghost);
      return check.canResurrect;
    });
  }

  /**
   * Clean up expired ghosts (optional, can be called periodically)
   */
  async cleanupExpiredGhosts(): Promise<number> {
    const storage = await chrome.storage.local.get();
    const ghostList = (storage.ghostList || []) as GhostItem[];

    const validGhosts = ghostList.filter((ghost) => !this.isExpired(ghost));
    const removedCount = ghostList.length - validGhosts.length;

    if (removedCount > 0) {
      await chrome.storage.local.set({ ghostList: validGhosts });
    }

    return removedCount;
  }
}
