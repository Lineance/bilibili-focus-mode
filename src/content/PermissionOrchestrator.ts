import { MS_PER_SECOND } from '@core/constants';
import { logger } from '@core/utils/logger';
import type { ProtocolMap } from '@core/protocol';
import type { VideoMetadata } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';
import { VideoMetadataExtractor } from './services/VideoMetadataExtractor';
import { BlockOverlayManager } from './components/BlockOverlayHost';
import { PermissionChecker } from './services/PermissionChecker';
import { VideoTracker } from './services/VideoTracker';

const DEFAULT_CONTENT_CONFIG: NonNullable<ProtocolMap['check-permission']['res']['config']> = {
  debtEnabled: true,
  entertainmentRatio: 2.0,
  learningRepayRatio: -1.0,
  maxDebtMinutes: 60,
  bankruptcyLockHours: 24,
  postWatchCooldownMinutes: 5,
  instantBreakFuse: true,
  collectionDetectionEnabled: true,
};

interface SafeSendMessageFn {
  <T>(type: keyof ProtocolMap, data?: unknown): Promise<T | null>;
}

export class PermissionOrchestrator {
  private checkInProgress = false;
  private pendingCheck = false;

  constructor(
    private metadataExtractor: VideoMetadataExtractor,
    private blockOverlayManager: BlockOverlayManager,
    private permissionChecker: PermissionChecker,
    private videoTracker: VideoTracker,
    private safeSendMessage: SafeSendMessageFn,
  ) {}

  async checkPermission(): Promise<void> {
    if (this.checkInProgress) {
      this.pendingCheck = true;
      return;
    }

    this.checkInProgress = true;
    try {
      await this.runCheckPermission();
    } finally {
      this.checkInProgress = false;
      if (this.pendingCheck) {
        this.pendingCheck = false;
        setTimeout(() => this.checkPermission(), 100);
      }
    }
  }

  private async runCheckPermission(): Promise<void> {
    logger.debug('Content', 'Checking permission...');

    const configForExtraction = this.permissionChecker.getLatestConfig() || DEFAULT_CONTENT_CONFIG;

    let metadata = this.metadataExtractor.extractVideoMetadata(configForExtraction.collectionDetectionEnabled);

    if (!metadata && this.metadataExtractor.isLivePage()) {
      logger.debug('Content', 'Extracting live metadata with retry...');
      metadata = await this.metadataExtractor.extractLiveMetadataWithRetry(10, MS_PER_SECOND);
    }

    if (!metadata) {
      logger.debug('Content', 'No metadata found, removing block');
      this.blockOverlayManager.remove();
      return;
    }

    const result = await this.permissionChecker.checkPermission(metadata, DEFAULT_CONTENT_CONFIG);

    if (!result) {
      logger.debug('Content', 'Failed to get permission result, allowing video');
      this.blockOverlayManager.remove();
      return;
    }

    this.videoTracker.updateConfig(result.config || null);
    this.videoTracker.updateVideoTag(result.videoTag || 'ENTERTAINMENT');
    this.videoTracker.setupVideoTracking();

    if (result.uploaderAllowed) {
      logger.debug('Content', 'Uploader is in allowlist, allowing video');
      this.blockOverlayManager.remove();
      return;
    }

    if (!result.allowed) {
      logger.debug('Content', 'Permission denied, showing block overlay');
      const allowFuseOutsideWindow = Boolean(result.config?.instantBreakFuse);
      const inReviewWindow = result.inReviewWindow;
      const isBankruptcy = result.reason === 'BANKRUPTCY';

      const { behaviorLog, config } = await StorageRepository.getKeys('behaviorLog', 'config');
      const dailyBypassEnabled = (config.dailyBypassEnabled as boolean) ?? true;
      const dailyBypassQuota = (config.dailyBypassQuota as number) ?? 3;
      const remainingUses = Math.max(0, dailyBypassQuota - (behaviorLog.dailyBypassesUsedToday || 0));

      const bypassInfo = {
        enabled: !isBankruptcy && dailyBypassEnabled,
        remainingUses,
      };

      const handleDailyBypass = async () => {
        try {
          const response = await this.safeSendMessage<ProtocolMap['daily-bypass']['res']>('daily-bypass', {});
          if (response?.success) {
            this.blockOverlayManager.remove();
            setTimeout(() => this.checkPermission(), 100);
          } else {
            alert(response?.message || '操作失败，请重试');
          }
        } catch {
          alert('操作失败，请重试');
        }
      };

      this.blockOverlayManager.show(
        metadata,
        result.reason,
        {
          inReviewWindow,
          timeUntilWindow: result.timeUntilWindow || 0,
        },
        {
          allowFuse: inReviewWindow || allowFuseOutsideWindow,
          isBankruptcy,
        },
        bypassInfo,
        (m: VideoMetadata) => this.addToLimbo(m),
        () => this.blockOverlayManager.openManagerPage(),
        handleDailyBypass
      );
    } else {
      logger.debug('Content', 'Permission granted, removing block');
      this.blockOverlayManager.remove();
    }
  }

  private async addToLimbo(metadata: VideoMetadata): Promise<void> {
    if (!chrome.runtime?.id) {
      console.error('[Content] Extension context invalidated');
      alert('扩展已失效，请刷新页面或重新加载扩展');
      return;
    }

    const tagSelection = await this.blockOverlayManager.showTagSelectionDialog(metadata);
    if (!tagSelection) return;

    try {
      const payload = {
        metadata: {
          bvid: metadata.bvid,
          title: metadata.title,
          uploader: metadata.uploader,
          coverUrl: metadata.coverUrl,
          tag: tagSelection,
          addedAt: metadata.addedAt,
        },
        sourceUrl: window.location.href,
      };

      const result = await this.safeSendMessage<ProtocolMap['add-to-limbo']['res']>('add-to-limbo', payload as { [key: string]: string | number | boolean | null | { [key: string]: string | number | boolean | null } });

      if (result === null) {
        logger.error('Content', 'Failed to send message: result is null');
        alert('消息发送失败，请刷新页面后重试');
        return;
      }

      if (result.success) {
        const tagText = tagSelection === 'LEARNING' ? '学习' : '娱乐';
        alert(`已加入待审池！标签：${tagText}\n请在审批时间前往管理页处理`);
        this.blockOverlayManager.remove();
      } else {
        alert('添加失败，待审池可能已满，请重试');
      }
    } catch (error) {
      console.error('[Content] Failed to add to limbo:', error);
      alert('添加失败，请重试');
    }
  }
}
