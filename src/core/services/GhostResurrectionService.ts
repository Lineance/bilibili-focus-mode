import { MIN_REPENTANCE_LENGTH } from '@core/constants';
import type { GhostItem, CoolingItem, VideoMetadata, ExtensionConfig, GlobalStats } from '@core/types';
import { ExpirationService } from './ExpirationService';
import { FuseService } from './FuseService';
import { storageQueue } from '@core/utils/storageQueue';

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
      minRepentanceLength: MIN_REPENTANCE_LENGTH,
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
    const expectedFuseCode = this.fuseService.generateFuseCode(this.config.ghostResurrectFuseLength);
    return this.performResurrection(ghostItem, fuseCodeInput, expectedFuseCode, repentanceReason);
  }

  async resurrectWithCode(
    ghostItem: GhostItem,
    expectedFuseCode: string,
    userFuseCode: string,
    repentanceReason: string
  ): Promise<ResurrectionResult> {
    return this.performResurrection(ghostItem, userFuseCode, expectedFuseCode, repentanceReason);
  }

  private async performResurrection(
    ghostItem: GhostItem,
    fuseCodeToVerify: string,
    expectedFuseCode: string,
    repentanceReason: string
  ): Promise<ResurrectionResult> {
    const canResurrectCheck = this.canResurrect(ghostItem);
    if (!canResurrectCheck.canResurrect) {
      return { success: false, message: canResurrectCheck.reason || '无法招魂' };
    }

    if (!repentanceReason || repentanceReason.trim().length < MIN_REPENTANCE_LENGTH) {
      return { success: false, message: '忏悔理由至少需要20个字' };
    }

    const isValid = this.fuseService.verifyFuseCode(fuseCodeToVerify, expectedFuseCode);
    if (!isValid) {
      return { success: false, message: '熔断码错误，请重新输入' };
    }

    const metadata: VideoMetadata = {
      bvid: ghostItem.bvid,
      title: ghostItem.title,
      uploader: ghostItem.uploader,
      coverUrl: ghostItem.coverUrl,
      tag: ghostItem.tag,
      addedAt: Date.now(),
    };
    const coolingItem = this.expirationService.createCoolingItem(metadata);

    const storage = await chrome.storage.local.get();
    const ghostList = (storage.ghostList || []) as GhostItem[];
    const coolingList = (storage.coolingList || []) as CoolingItem[];

    const updatedGhostList = ghostList.map((g) => {
      if (g.bvid === ghostItem.bvid) {
        return { ...g, resurrected: true, repentanceReason: repentanceReason.trim() };
      }
      return g;
    });

    const filteredCoolingList = coolingList.filter(i => i.bvid !== ghostItem.bvid);
    filteredCoolingList.push(coolingItem);

    const globalStats: GlobalStats = (storage.globalStats as GlobalStats) || { ghostResurrectionsTotal: 0, fuseApplicationsTotal: 0, fuseOverridesTotal: 0, bankruptcyHistory: [], lifecycleTransitions: {} };
    globalStats.ghostResurrectionsTotal++;

    await storageQueue.enqueue(() =>
      chrome.storage.local.set({
        ghostList: updatedGhostList,
        coolingList: filteredCoolingList,
        globalStats,
      })
    );

    return {
      success: true,
      message: `招魂成功！视频已进入冷静期${this.config.ghostDoublePenalty ? '（双倍冷静期惩罚）' : ''}`,
      coolingItem,
    };
  }
}
