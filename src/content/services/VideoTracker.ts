import { MS_PER_MINUTE } from '@core/constants';
import type { ProtocolMap } from '@core/protocol';
import type { VideoTag } from '@core/types';

interface SafeSendMessage {
  <T>(type: keyof ProtocolMap, data?: unknown): Promise<T | null>;
}

export class VideoTracker {
  private trackedVideo: HTMLVideoElement | null = null;
  private watchIntervalId: number | null = null;
  private lastWatchTick = 0;
  private latestConfig: { debtEnabled?: boolean } | null = null;
  private latestVideoTag: VideoTag = 'ENTERTAINMENT';
  private latestTitle = '';
  private latestUploader = '';
  /**
   * The video whose watch time is currently being accumulated. Kept separately
   * from PermissionChecker because a permission check for the *next* video runs
   * before the previous timer is flushed; using the new bvid there would credit
   * the previous video's minutes to the wrong entry.
   */
  private currentBvid: string | null = null;
  private safeSendMessage: SafeSendMessage;

  constructor(safeSendMessage: SafeSendMessage) {
    this.safeSendMessage = safeSendMessage;
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
   * Update video metadata (title, uploader)
   */
  updateVideoMetadata(title: string, uploader: string): void {
    this.latestTitle = title;
    this.latestUploader = uploader;
  }

  /**
   * Switch the tracked video. Flushes the previous video's pending minutes
   * before the bvid changes so cross-video SPA navigation stays accurate.
   */
  updateBvid(bvid: string): void {
    if (this.currentBvid === bvid) return;
    this.stopWatchTimer(true);
    this.currentBvid = bvid;
  }

  /** Stop accumulating time (e.g. left the video page). */
  stopTracking(): void {
    this.stopWatchTimer(true);
    this.currentBvid = null;
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
    const bvid = this.currentBvid;
    if (!bvid) return;
    this.safeSendMessage('watch-ended', {
      bvid,
      endedAt: Date.now(),
      title: this.latestTitle || undefined,
      uploader: this.latestUploader || undefined,
      tag: this.latestVideoTag,
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
    if (sendFinal) {
      // Flush before clearing the id so sendDebtDelta still sees the interval.
      this.sendDebtDelta();
    }
    clearInterval(this.watchIntervalId);
    this.watchIntervalId = null;
  }

  /**
   * Send debt delta
   */
  private sendDebtDelta(): void {
    if (!this.latestConfig?.debtEnabled) {
      // Do not accrue time while debt tracking is off; otherwise re-enabling it
      // would flush the whole disabled period as a single delta.
      this.lastWatchTick = Date.now();
      return;
    }
    const now = Date.now();
    const minutes = (now - this.lastWatchTick) / MS_PER_MINUTE;
    if (minutes <= 0) return;
    this.lastWatchTick = now;

    const bvid = this.currentBvid;
    if (!bvid) return;

    this.safeSendMessage('update-debt', {
      minutes,
      tag: this.latestVideoTag,
      bvid,
    } as ProtocolMap['update-debt']['req']).catch((error) => {
      console.error('[Content] Failed to update debt:', error);
    });
  }
}
