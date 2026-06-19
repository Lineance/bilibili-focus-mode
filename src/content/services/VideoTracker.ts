import { MS_PER_MINUTE } from '@core/constants';
import type { ProtocolMap } from '@core/protocol';
import type { VideoTag } from '@core/types';

interface SafeSendMessage {
  <T>(type: string, data?: unknown): Promise<T | null>;
}

export class VideoTracker {
  private trackedVideo: HTMLVideoElement | null = null;
  private watchIntervalId: number | null = null;
  private lastWatchTick = 0;
  private latestConfig: { debtEnabled?: boolean } | null = null;
  private latestVideoTag: VideoTag = 'ENTERTAINMENT';
  private currentBvid: string | null = null;
  private safeSendMessage: SafeSendMessage;

  constructor(
    safeSendMessage: SafeSendMessage,
    getCurrentBvid: () => string | null
  ) {
    this.safeSendMessage = safeSendMessage;
    this.currentBvid = getCurrentBvid();
  }

  /**
   * Update config
   */
  updateConfig(config: { debtEnabled?: boolean } | null): void {
    this.latestConfig = config;
  }

  /**
   * Update video tag
   */
  updateVideoTag(tag: VideoTag): void {
    this.latestVideoTag = tag;
  }

  /**
   * Setup video tracking
   */
  setupVideoTracking(): void {
    const video = document.querySelector('video');
    if (!video || video === this.trackedVideo) return;

    if (this.trackedVideo) {
      this.trackedVideo.removeEventListener('play', this.handlePlay);
      this.trackedVideo.removeEventListener('pause', this.handlePause);
      this.trackedVideo.removeEventListener('ended', this.handleEnded);
    }

    this.trackedVideo = video;
    this.trackedVideo.addEventListener('play', this.handlePlay);
    this.trackedVideo.addEventListener('pause', this.handlePause);
    this.trackedVideo.addEventListener('ended', this.handleEnded);
  }

  /**
   * Handle play event
   */
  private handlePlay = (): void => {
    if (!this.latestConfig?.debtEnabled) return;
    this.startWatchTimer();
  };

  /**
   * Handle pause event
   */
  private handlePause = (): void => {
    this.stopWatchTimer(true);
  };

  /**
   * Handle ended event
   */
  private handleEnded = (): void => {
    this.stopWatchTimer(true);
    if (!this.currentBvid) return;
    this.safeSendMessage('watch-ended', {
      bvid: this.currentBvid,
      endedAt: Date.now(),
    } as ProtocolMap['watch-ended']['req']).catch((error) => {
      console.error('[Content] Failed to report watch end:', error);
    });
  };

  /**
   * Start watch timer
   */
  private startWatchTimer(): void {
    if (this.watchIntervalId) return;
    this.lastWatchTick = Date.now();
    this.watchIntervalId = window.setInterval(() => {
      this.sendDebtDelta();
    }, MS_PER_MINUTE);
  }

  /**
   * Stop watch timer
   */
  private stopWatchTimer(sendFinal: boolean): void {
    if (!this.watchIntervalId) return;
    clearInterval(this.watchIntervalId);
    this.watchIntervalId = null;
    if (sendFinal) {
      this.sendDebtDelta();
    }
  }

  /**
   * Send debt delta
   */
  private sendDebtDelta(): void {
    if (!this.latestConfig?.debtEnabled) return;
    const now = Date.now();
    const minutes = (now - this.lastWatchTick) / MS_PER_MINUTE;
    if (minutes <= 0) return;
    this.lastWatchTick = now;

    this.safeSendMessage('update-debt', {
      minutes,
      tag: this.latestVideoTag,
    } as ProtocolMap['update-debt']['req']).catch((error) => {
      console.error('[Content] Failed to update debt:', error);
    });
  }
}
