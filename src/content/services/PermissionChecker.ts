import type { ProtocolMap } from '@core/protocol';
import type { ExtensionConfig, VideoMetadata } from '@core/types';

interface SafeSendMessage {
  <T>(type: string, data?: unknown): Promise<T | null>;
}

interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  config: ProtocolMap['check-permission']['res']['config'];
  videoTag: ProtocolMap['check-permission']['res']['videoTag'];
  uploaderAllowed: boolean;
  inReviewWindow: boolean;
  timeUntilWindow: number;
}

export class PermissionChecker {
  private safeSendMessage: SafeSendMessage;
  private latestConfig: ProtocolMap['check-permission']['res']['config'] | null = null;
  private latestVideoTag: ProtocolMap['check-permission']['res']['videoTag'] = 'ENTERTAINMENT';
  private currentBvid: string | null = null;

  constructor(safeSendMessage: SafeSendMessage) {
    this.safeSendMessage = safeSendMessage;
  }

  /**
   * Get current BVID
   */
  getCurrentBvid(): string | null {
    return this.currentBvid;
  }

  /**
   * Get latest config
   */
  getLatestConfig(): ProtocolMap['check-permission']['res']['config'] | null {
    return this.latestConfig;
  }

  /**
   * Get latest video tag
   */
  getLatestVideoTag(): ProtocolMap['check-permission']['res']['videoTag'] {
    return this.latestVideoTag;
  }

  /**
   * Check permission for video
   */
  async checkPermission(
    metadata: VideoMetadata | null,
    defaultConfig: NonNullable<ProtocolMap['check-permission']['res']['config']>
  ): Promise<PermissionCheckResult | null> {
    if (!metadata) {
      return null;
    }

    this.currentBvid = metadata.bvid;

    try {
      const result = await this.safeSendMessage<ProtocolMap['check-permission']['res']>('check-permission', {
        bvid: metadata.bvid,
        uploaderName: metadata.uploader,
        title: metadata.title
      } as ProtocolMap['check-permission']['req']);

      if (!result) {
        return null;
      }

      this.latestConfig = result.config || this.latestConfig || defaultConfig;
      this.latestVideoTag = result.videoTag || 'ENTERTAINMENT';

      return {
        allowed: result.allowed,
        reason: result.reason || '',
        config: this.latestConfig,
        videoTag: this.latestVideoTag,
        uploaderAllowed: result.uploaderAllowed || false,
        inReviewWindow: result.inReviewWindow || false,
        timeUntilWindow: result.timeUntilWindow || 0,
      };
    } catch (error) {
      console.error('[Content] Failed to check permission:', error);
      return null;
    }
  }

  /**
   * Get full config from background
   */
  async getFullConfig(): Promise<ExtensionConfig | null> {
    try {
      const response = await this.safeSendMessage<{ config: ExtensionConfig }>('get-full-config', {});
      return response?.config || null;
    } catch (error) {
      console.error('[Content] Failed to get full config:', error);
      return null;
    }
  }
}
