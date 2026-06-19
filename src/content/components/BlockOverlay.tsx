import { MANAGER_PAGE_PATH } from '@core/constants';
import type { VideoMetadata, VideoTag } from '@core/types';

interface BlockOverlayOptions {
  inReviewWindow: boolean;
  timeUntilWindow: number;
}

interface FuseOptions {
  allowFuse: boolean;
  isBankruptcy: boolean;
}

export class BlockOverlayManager {
  /**
   * Show block overlay
   */
  show(
    metadata: VideoMetadata,
    reason: string,
    windowInfo: BlockOverlayOptions,
    fuseInfo: FuseOptions,
    onAddToLimbo: (metadata: VideoMetadata) => Promise<void>,
    onOpenManager: () => void
  ): void {
    this.applyHardBlock();

    const existing = document.querySelector('.bilibili-focus-mode-block-overlay');
    if (existing) existing.remove();

    const isOutsideWindow = !windowInfo.inReviewWindow;
    const timeText = this.formatTime(windowInfo.timeUntilWindow);
    const isBankruptcy = fuseInfo.isBankruptcy || reason === 'BANKRUPTCY';

    const overlay = document.createElement('div');
    overlay.className = 'bilibili-focus-mode-block-overlay';

    const boxContent = this.getBoxContent(isBankruptcy, isOutsideWindow, timeText);
    const boxBg = isBankruptcy ? 'rgba(239, 68, 68, 0.2)' : (isOutsideWindow ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.1)');
    const boxBorder = (isBankruptcy || isOutsideWindow) ? `1px solid ${isBankruptcy ? '#ef4444' : '#f59e0b'}` : 'none';

    overlay.innerHTML = `
      <div style="text-align: center; max-width: 500px; padding: 20px;">
        <h2 style="margin-bottom: 16px; font-size: 24px;">🔒 视频未审批</h2>
        <p style="margin-bottom: 8px; font-size: 16px; opacity: 0.9;">${metadata.title}</p>
        <p style="margin-bottom: 24px; font-size: 14px; opacity: 0.7;">UP 主：${metadata.uploader}</p>
        
        <div style="margin-bottom: 24px; padding: 16px; background: ${boxBg}; border: ${boxBorder}; border-radius: 8px;">
          ${boxContent}
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">
          <div id="bfm-add-limbo" style="padding: 10px 24px !important; background: #00aeec !important; border-radius: 6px !important; color: white !important; cursor: pointer !important; font-size: 14px !important; font-weight: bold !important; display: inline-block !important; user-select: none !important; transition: opacity 0.2s !important;">
            加入待审池
          </div>
          <div id="bfm-open-manager" style="padding: 10px 24px !important; background: transparent !important; border: 1px solid white !important; border-radius: 6px !important; color: white !important; cursor: pointer !important; font-size: 14px !important; display: inline-block !important; user-select: none !important; transition: opacity 0.2s !important;">
            打开管理页
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    this.setupButtonListeners(overlay, onAddToLimbo, onOpenManager);
  }

  /**
   * Remove block overlay
   */
  remove(): void {
    const overlay = document.querySelector('.bilibili-focus-mode-block-overlay');
    if (overlay) overlay.remove();
  }

  /**
   * Apply hard block - hide video player
   */
  private applyHardBlock(): void {
    const playerSelectors = [
      '.bilibili-player',
      '.bpx-player-container',
      '#bilibili-player',
      '.player-container',
      '#live-player',
      '.live-player',
      '[class*="live-player"]',
      '[class*="player"]',
      '#player',
    ];

    playerSelectors.forEach(selector => {
      const players = document.querySelectorAll(selector);
      players.forEach(player => {
        (player as HTMLElement).style.display = 'none';
      });
    });

    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
  }

  /**
   * Format milliseconds to readable time
   */
  private formatTime(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  }

  /**
   * Get box content based on state
   */
  private getBoxContent(isBankruptcy: boolean, isOutsideWindow: boolean, timeText: string): string {
    if (isBankruptcy) {
      return `
        <p style="margin-bottom: 8px; font-weight: bold; color: #ef4444;">❌ 破产锁定中</p>
        <p style="font-size: 14px; opacity: 0.8;">破产期间禁止所有娱乐消费<br>虽然当前是审批时间，但你已陷入债务破产，请先前往管理页偿还债务。</p>
      `;
    } else if (isOutsideWindow) {
      return `
        <p style="margin-bottom: 8px; font-weight: bold; color: #f59e0b;">⏰ 当前不在审批时间</p>
        <p style="font-size: 14px; opacity: 0.8;">距离下次审批时间：${timeText}<br><span style="font-size: 12px; opacity: 0.6; margin-top: 8px;">审批时间才能处理待审池视频</span></p>
      `;
    } else {
      return `
        <p style="margin-bottom: 8px; font-weight: bold; color: #10b981;">✅ 当前是审批时间</p>
        <p style="font-size: 14px; opacity: 0.8;">你可以现在处理待审池视频。<br>请先将此视频"加入待审池"，然后在管理页点击通过即可开始观看。</p>
      `;
    }
  }

  /**
   * Setup button event listeners
   */
  private setupButtonListeners(
    overlay: Element,
    onAddToLimbo: (metadata: VideoMetadata) => Promise<void>,
    onOpenManager: () => void
  ): void {
    const addBtn = overlay.querySelector('#bfm-add-limbo') as HTMLElement;
    const mgrBtn = overlay.querySelector('#bfm-open-manager') as HTMLElement;
    
    if (addBtn) {
      addBtn.onmouseover = () => { addBtn.style.opacity = '0.8'; };
      addBtn.onmouseout = () => { addBtn.style.opacity = '1'; };
      addBtn.onclick = () => onAddToLimbo({} as VideoMetadata);
    }
    
    if (mgrBtn) {
      mgrBtn.onmouseover = () => { mgrBtn.style.opacity = '0.8'; };
      mgrBtn.onmouseout = () => { mgrBtn.style.opacity = '1'; };
      mgrBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenManager();
      };
    }
  }

  /**
   * Show tag selection dialog
   */
  showTagSelectionDialog(metadata: VideoMetadata): Promise<VideoTag | null> {
    const existing = document.querySelector('.bfm-tag-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.className = 'bfm-tag-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
    `;

    dialog.innerHTML = `
      <div style="background: #1a1a2e; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: white;">选择视频类型</h3>
        <p style="margin: 0 0 20px 0; color: #aaa; font-size: 14px;">${metadata.title}</p>
        <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <button id="bfm-tag-learning" style="flex: 1; min-width: 100px; padding: 12px; background: #10b981; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 14px;">
            📚 学习
          </button>
          <button id="bfm-tag-music" style="flex: 1; min-width: 100px; padding: 12px; background: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 14px;">
            🎵 音乐
          </button>
          <button id="bfm-tag-entertainment" style="flex: 1; min-width: 100px; padding: 12px; background: #f59e0b; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 14px;">
            🎮 娱乐
          </button>
        </div>
        <button id="bfm-tag-cancel" style="width: 100%; padding: 10px; background: transparent; border: 1px solid #666; border-radius: 8px; color: #aaa; cursor: pointer; font-size: 14px;">
          取消
        </button>
      </div>
    `;

    document.body.appendChild(dialog);

    return new Promise<VideoTag | null>((resolve) => {
      dialog.querySelector('#bfm-tag-learning')?.addEventListener('click', () => {
        dialog.remove();
        resolve('LEARNING');
      });

      dialog.querySelector('#bfm-tag-music')?.addEventListener('click', () => {
        dialog.remove();
        resolve('MUSIC');
      });

      dialog.querySelector('#bfm-tag-entertainment')?.addEventListener('click', () => {
        dialog.remove();
        resolve('ENTERTAINMENT');
      });

      dialog.querySelector('#bfm-tag-cancel')?.addEventListener('click', () => {
        dialog.remove();
        resolve(null);
      });

      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.remove();
          resolve(null);
        }
      });
    });
  }

  /**
   * Open manager page
   */
  openManagerPage(): void {
    const optionsUrl = chrome.runtime.getURL(MANAGER_PAGE_PATH);

    if (!chrome.runtime?.id) {
      console.error('[Bilibili Focus Mode] Extension context invalidated');
      alert('扩展已失效，请刷新页面或重新加载扩展');
      return;
    }

    try {
      chrome.runtime.sendMessage({ action: 'openOptionsPage' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('[Bilibili Focus Mode] Background open failed:', chrome.runtime.lastError);
          window.open(optionsUrl, '_blank');
        } else if (!response?.success) {
          console.log('[Bilibili Focus Mode] Background returned failure');
          window.open(optionsUrl, '_blank');
        }
      });
    } catch (error) {
      console.error('[Bilibili Focus Mode] Exception:', error);
      window.open(optionsUrl, '_blank');
    }
  }
}
