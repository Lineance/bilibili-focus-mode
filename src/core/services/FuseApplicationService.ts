import type { InstantItem, VideoMetadata, ExtensionConfig, BehaviorLog } from '@core/types';
import { FuseService } from './FuseService';
import { ExpirationService } from './ExpirationService';

export interface FuseApplication {
  bvid: string;
  fuseCode: string;
  length: number;
  createdAt: number;
  expiresAt: number;
}

export class FuseApplicationService {
  private fuseService: FuseService;
  private expirationService: ExpirationService;

  constructor(config: ExtensionConfig) {
    this.fuseService = new FuseService(config);
    this.expirationService = new ExpirationService(
      config.coolingCooldownHours,
      config.coolingAvailableHours,
      config.instantDurationHours,
      config.ghostLifespanDays
    );
  }

  /**
   * Apply for a fuse code to watch a video immediately
   */
  async applyForFuse(
    metadata: VideoMetadata,
    behaviorLog: BehaviorLog,
    isBankruptcy: boolean,
    remainingBankruptcyMinutes: number = 0
  ): Promise<{ success: true; item: InstantItem } | { success: false; reason: string }> {
    // Check if already has an active instant item
    const storage = await chrome.storage.local.get();
    const existingInstant = (storage.instantList || []).find(
      (item: InstantItem) => item.bvid === metadata.bvid
    );

    if (existingInstant) {
      const now = Date.now();
      if (now < existingInstant.expiresAt) {
        return {
          success: false,
          reason: '已存在有效的即时许可',
        };
      }
    }

    // Calculate fuse length based on recent applications
    const recentApps = this.countRecentApplications(behaviorLog);
    const lastAppTime = behaviorLog.lastInstantApplication;
    const within10Minutes = lastAppTime > 0 && Date.now() - lastAppTime < 10 * 60 * 1000;

    let fuseLength: number;
    if (isBankruptcy) {
      fuseLength = this.fuseService.calculateBankruptcyFuse(remainingBankruptcyMinutes);
    } else {
      fuseLength = this.fuseService.calculateFuseLength(recentApps, within10Minutes);
    }

    // Generate fuse code
    const fuseCode = this.fuseService.generateFuseCode(fuseLength);

    // Create instant item
    const instantItem = this.expirationService.createInstantItem(metadata, fuseCode);

    // Update behavior log
    const updatedBehaviorLog: BehaviorLog = {
      ...behaviorLog,
      lastInstantApplication: Date.now(),
      instantApplicationsToday: behaviorLog.instantApplicationsToday + 1,
    };

    // Save to storage
    const instantList = (storage.instantList || []) as InstantItem[];
    instantList.push(instantItem);

    await chrome.storage.local.set({
      instantList,
      behaviorLog: updatedBehaviorLog,
    });

    return {
      success: true,
      item: instantItem,
    };
  }

  /**
   * Verify a fuse code and activate the instant permission
   */
  async verifyFuse(bvid: string, inputCode: string): Promise<{ success: boolean; message: string }> {
    const storage = await chrome.storage.local.get();
    const instantList = (storage.instantList || []) as InstantItem[];
    
    const instantItem = instantList.find((item) => item.bvid === bvid);

    if (!instantItem) {
      return {
        success: false,
        message: '未找到该视频的即时许可申请',
      };
    }

    const now = Date.now();
    if (now >= instantItem.expiresAt) {
      return {
        success: false,
        message: '熔断码已过期，请重新申请',
      };
    }

    if (instantItem.usedFuse) {
      return {
        success: false,
        message: '熔断码已被使用',
      };
    }

    const isValid = this.fuseService.verifyFuseCode(inputCode, instantItem.fuseCode);

    if (!isValid) {
      return {
        success: false,
        message: '熔断码错误，请重新输入',
      };
    }

    // Mark as used
    instantItem.usedFuse = true;
    await chrome.storage.local.set({ instantList });

    return {
      success: true,
      message: '熔断码验证成功，可以观看视频',
    };
  }

  /**
   * Check if a video has an active instant permission
   */
  async hasActiveInstant(bvid: string): Promise<boolean> {
    const storage = await chrome.storage.local.get();
    const instantList = (storage.instantList || []) as InstantItem[];
    const item = instantList.find((i) => i.bvid === bvid);

    if (!item) return false;

    const now = Date.now();
    return now < item.expiresAt && item.usedFuse;
  }

  /**
   * Get the fuse code for a video (for display purposes)
   */
  async getFuseCode(bvid: string): Promise<string | null> {
    const storage = await chrome.storage.local.get();
    const instantList = (storage.instantList || []) as InstantItem[];
    const item = instantList.find((i) => i.bvid === bvid);

    return item?.fuseCode || null;
  }

  private countRecentApplications(behaviorLog: BehaviorLog): number {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // If last application was within 1 hour, count it
    if (behaviorLog.lastInstantApplication > oneHourAgo) {
      return behaviorLog.instantApplicationsToday;
    }
    
    return 0;
  }
}
