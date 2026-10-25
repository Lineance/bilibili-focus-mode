import { logger } from '@core/utils/logger';

const SPEED_STORAGE_KEY = 'videoSpeedMemory';

interface PatchedVideo extends HTMLVideoElement {
  __bfmSpeedPatched?: boolean;
  __bfmOriginalPlaybackRate?: PropertyDescriptor;
}

export class SpeedController {
  private videoElement: PatchedVideo | null = null;
  private speedObserver: MutationObserver | null = null;
  private loadedDataHandler: (() => void) | null = null;
  private enabled = false;
  private speedMemoryEnabled = false;
  private minSpeed = 0.0625;
  private maxSpeed = 16;

  enableExtendedSpeed(minSpeed: number, maxSpeed: number): void {
    this.minSpeed = minSpeed;
    this.maxSpeed = maxSpeed;
    this.enabled = true;
    this.setupVideoElement();
    logger.debug('SpeedController', 'Extended speed enabled:', { minSpeed, maxSpeed });
  }

  enableSpeedMemory(): void {
    this.speedMemoryEnabled = true;
    this.setupVideoElement();
    logger.debug('SpeedController', 'Speed memory enabled');
  }

  disable(): void {
    this.enabled = false;
    this.speedMemoryEnabled = false;
    this.cleanup();
    logger.debug('SpeedController', 'Disabled');
  }

  private setupVideoElement(): void {
    const video = document.querySelector('video') as PatchedVideo | null;
    if (!video || video === this.videoElement) return;

    // Switching videos (SPA navigation) must release resources attached to the
    // previous element, otherwise observers and property patches pile up.
    this.releaseVideoElement();

    this.videoElement = video;

    if (this.enabled) {
      this.injectExtendedSpeedOptions();
    }

    if (this.speedMemoryEnabled) {
      this.restoreSpeed();
      this.watchSpeedChanges();
    }

    this.loadedDataHandler = () => {
      if (this.speedMemoryEnabled) {
        this.restoreSpeed();
      }
    };
    video.addEventListener('loadeddata', this.loadedDataHandler);
  }

  private injectExtendedSpeedOptions(): void {
    if (!this.videoElement) return;

    const player = this.videoElement.closest('.bpx-player-container, .bilibili-player');
    if (!player) return;

    this.speedObserver?.disconnect();
    this.speedObserver = new MutationObserver(() => {
      this.addCustomSpeedOptions();
    });

    this.speedObserver.observe(player, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => this.addCustomSpeedOptions(), 1000);
  }

  private addCustomSpeedOptions(): void {
    const speedMenu = document.querySelector('.bpx-player-ctrl-playbackrate, .bilibili-player-video-btn-speed');
    if (!speedMenu) return;

    const existingCustom = speedMenu.querySelector('.bfm-custom-speed');
    if (existingCustom) return;

    const container = document.createElement('div');
    container.className = 'bfm-custom-speed';
    container.style.cssText = 'padding: 4px 8px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px;';

    const label = document.createElement('span');
    label.textContent = '自定义倍速: ';
    label.style.cssText = 'font-size: 12px; color: #aaa;';
    container.appendChild(label);

    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(this.minSpeed);
    input.max = String(this.maxSpeed);
    input.step = '0.25';
    input.value = String(this.videoElement?.playbackRate || 1);
    input.style.cssText = 'width: 60px; padding: 2px 4px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;';
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const rate = parseFloat(target.value);
      if (!isNaN(rate) && rate >= this.minSpeed && rate <= this.maxSpeed && this.videoElement) {
        this.videoElement.playbackRate = rate;
        if (this.speedMemoryEnabled) {
          this.saveSpeed(rate);
        }
      }
    });
    container.appendChild(input);

    const rateLabel = document.createElement('span');
    rateLabel.textContent = 'x';
    rateLabel.style.cssText = 'font-size: 12px; color: #aaa; margin-left: 2px;';
    container.appendChild(rateLabel);

    speedMenu.appendChild(container);
  }

  private watchSpeedChanges(): void {
    const video = this.videoElement;
    if (!video || video.__bfmSpeedPatched) return;

    const originalRate = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
    if (!originalRate) return;

    Object.defineProperty(video, 'playbackRate', {
      get: () => originalRate.get?.call(video) ?? 1,
      set: (rate: number) => {
        originalRate.set?.call(video, rate);
        if (this.speedMemoryEnabled) {
          void this.saveSpeed(rate);
        }
      },
      configurable: true,
    });

    video.__bfmSpeedPatched = true;
    video.__bfmOriginalPlaybackRate = originalRate;
  }

  private async saveSpeed(rate: number): Promise<void> {
    const bvid = this.getCurrentBvid();
    if (!bvid) return;

    try {
      const storage = await chrome.storage.local.get(SPEED_STORAGE_KEY);
      const memory = (storage[SPEED_STORAGE_KEY] as Record<string, number>) || {};
      memory[bvid] = rate;
      memory['_default'] = rate;
      await chrome.storage.local.set({ [SPEED_STORAGE_KEY]: memory });
    } catch (error) {
      logger.error('SpeedController', 'Failed to save speed:', error);
    }
  }

  private async restoreSpeed(): Promise<void> {
    if (!this.videoElement) return;

    const bvid = this.getCurrentBvid();
    if (!bvid) return;

    try {
      const storage = await chrome.storage.local.get(SPEED_STORAGE_KEY);
      const memory = (storage[SPEED_STORAGE_KEY] as Record<string, number>) || {};
      const savedRate = memory[bvid] ?? memory['_default'];
      if (savedRate && savedRate >= this.minSpeed && savedRate <= this.maxSpeed) {
        this.videoElement.playbackRate = savedRate;
        logger.debug('SpeedController', 'Restored speed:', { bvid, rate: savedRate });
      }
    } catch (error) {
      logger.error('SpeedController', 'Failed to restore speed:', error);
    }
  }

  private getCurrentBvid(): string | null {
    const match = window.location.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  private releaseVideoElement(): void {
    if (this.speedObserver) {
      this.speedObserver.disconnect();
      this.speedObserver = null;
    }

    if (this.videoElement) {
      if (this.loadedDataHandler) {
        this.videoElement.removeEventListener('loadeddata', this.loadedDataHandler);
      }
      if (this.videoElement.__bfmSpeedPatched) {
        // Remove the instance-level override so the native prototype accessor
        // is used again (and so a future video does not inherit this patch).
        delete (this.videoElement as unknown as Record<string, unknown>).playbackRate;
        delete this.videoElement.__bfmSpeedPatched;
        delete this.videoElement.__bfmOriginalPlaybackRate;
      }
    }

    this.loadedDataHandler = null;
    this.videoElement = null;
  }

  private cleanup(): void {
    this.releaseVideoElement();

    const customSpeed = document.querySelector('.bfm-custom-speed');
    if (customSpeed) {
      customSpeed.remove();
    }
  }
}
