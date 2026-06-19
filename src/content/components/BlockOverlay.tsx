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

interface BypassInfo {
  enabled: boolean;
  remainingUses: number;
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
    bypassInfo: BypassInfo,
    onAddToLimbo: (metadata: VideoMetadata) => Promise<void>,
    onOpenManager: () => void,
    onDailyBypass: () => void
  ): void {
    this.applyHardBlock();

    const existing = document.querySelector('.bilibili-focus-mode-block-overlay');
    if (existing) existing.remove();

    const isOutsideWindow = !windowInfo.inReviewWindow;
    const isBankruptcy = fuseInfo.isBankruptcy || reason === 'BANKRUPTCY';

    const effectiveBypassInfo: BypassInfo = isBankruptcy
      ? { enabled: false, remainingUses: bypassInfo.remainingUses }
      : bypassInfo;

    const overlay = document.createElement('div');
    overlay.className = 'bilibili-focus-mode-block-overlay';

    const container = this.createOverlayContainer();
    container.appendChild(this.createInfoSection(metadata));
    container.appendChild(this.createStatusBox(isBankruptcy, isOutsideWindow, this.formatTime(windowInfo.timeUntilWindow)));
    container.appendChild(this.createButtonBar(effectiveBypassInfo));

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    this.setupButtonListeners(overlay, metadata, onAddToLimbo, onOpenManager, onDailyBypass);

    if (isBankruptcy) {
      const addBtn = overlay.querySelector('#bfm-add-limbo') as HTMLElement;
      if (addBtn) addBtn.style.display = 'none';
    }
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
   * Create overlay container div
   */
  private createOverlayContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = 'text-align: center; max-width: 500px; padding: 20px;';
    return container;
  }

  /**
   * Create info section with title and uploader
   */
  private createInfoSection(metadata: VideoMetadata): DocumentFragment {
    const fragment = document.createDocumentFragment();

    const h2 = document.createElement('h2');
    h2.style.cssText = 'margin-bottom: 16px; font-size: 24px;';
    h2.textContent = '🔒 视频未审批';
    fragment.appendChild(h2);

    const titleP = document.createElement('p');
    titleP.style.cssText = 'margin-bottom: 8px; font-size: 16px; opacity: 0.9;';
    titleP.textContent = metadata.title;
    fragment.appendChild(titleP);

    const uploaderP = document.createElement('p');
    uploaderP.style.cssText = 'margin-bottom: 24px; font-size: 14px; opacity: 0.7;';
    uploaderP.textContent = `UP 主：${metadata.uploader}`;
    fragment.appendChild(uploaderP);

    return fragment;
  }

  /**
   * Create status box based on bankruptcy/window state
   */
  private createStatusBox(isBankruptcy: boolean, isOutsideWindow: boolean, timeText: string): HTMLDivElement {
    const boxBg = isBankruptcy ? 'rgba(239, 68, 68, 0.2)' : (isOutsideWindow ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.1)');
    const boxBorder = (isBankruptcy || isOutsideWindow) ? `1px solid ${isBankruptcy ? '#ef4444' : '#f59e0b'}` : 'none';
    const boxDiv = document.createElement('div');
    boxDiv.style.cssText = `margin-bottom: 24px; padding: 16px; background: ${boxBg}; border: ${boxBorder}; border-radius: 8px;`;
    this.appendBoxContent(boxDiv, isBankruptcy, isOutsideWindow, timeText);
    return boxDiv;
  }

  /**
   * Create button bar with add and manager buttons
   */
  private createButtonBar(bypassInfo: BypassInfo): HTMLDivElement {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 20px;';

    if (bypassInfo.enabled && bypassInfo.remainingUses > 0) {
      const bypassBtn = document.createElement('div');
      bypassBtn.id = 'bfm-daily-bypass';
      bypassBtn.style.cssText = 'padding: 10px 24px !important; background: #10b981 !important; border-radius: 6px !important; color: white !important; cursor: pointer !important; font-size: 14px !important; font-weight: bold !important; display: inline-block !important; user-select: none !important; transition: opacity 0.2s !important;';
      bypassBtn.textContent = `每日放行 (${bypassInfo.remainingUses}次)`;
      buttonsDiv.appendChild(bypassBtn);
    }

    const addBtn = document.createElement('div');
    addBtn.id = 'bfm-add-limbo';
    addBtn.style.cssText = 'padding: 10px 24px !important; background: #00aeec !important; border-radius: 6px !important; color: white !important; cursor: pointer !important; font-size: 14px !important; font-weight: bold !important; display: inline-block !important; user-select: none !important; transition: opacity 0.2s !important;';
    addBtn.textContent = '加入待审池';
    buttonsDiv.appendChild(addBtn);

    const mgrBtn = document.createElement('div');
    mgrBtn.id = 'bfm-open-manager';
    mgrBtn.style.cssText = 'padding: 10px 24px !important; background: transparent !important; border: 1px solid white !important; border-radius: 6px !important; color: white !important; cursor: pointer !important; font-size: 14px !important; display: inline-block !important; user-select: none !important; transition: opacity 0.2s !important;';
    mgrBtn.textContent = '打开管理页';
    buttonsDiv.appendChild(mgrBtn);

    return buttonsDiv;
  }

  /**
   * Create tag selection dialog content
   */
  private createTagDialog(metadata: VideoMetadata): HTMLDivElement {
    const dialog = document.createElement('div');
    dialog.className = 'bfm-tag-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', '选择视频类型');
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

    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'background: #1a1a2e; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;';

    const h3 = document.createElement('h3');
    h3.style.cssText = 'margin: 0 0 16px 0; font-size: 18px; color: white;';
    h3.textContent = '选择视频类型';
    contentDiv.appendChild(h3);

    const titleP = document.createElement('p');
    titleP.style.cssText = 'margin: 0 0 20px 0; color: #aaa; font-size: 14px;';
    titleP.textContent = metadata.title;
    contentDiv.appendChild(titleP);

    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;';

    const createTagButton = (id: string, bg: string, text: string) => {
      const btn = document.createElement('button');
      btn.id = id;
      btn.style.cssText = `flex: 1; min-width: 100px; padding: 12px; background: ${bg}; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 14px;`;
      btn.textContent = text;
      return btn;
    };

    buttonsDiv.appendChild(createTagButton('bfm-tag-learning', '#10b981', '📚 学习'));
    buttonsDiv.appendChild(createTagButton('bfm-tag-music', '#3b82f6', '🎵 音乐'));
    buttonsDiv.appendChild(createTagButton('bfm-tag-entertainment', '#f59e0b', '🎮 娱乐'));
    contentDiv.appendChild(buttonsDiv);

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'bfm-tag-cancel';
    cancelBtn.style.cssText = 'width: 100%; padding: 10px; background: transparent; border: 1px solid #666; border-radius: 8px; color: #aaa; cursor: pointer; font-size: 14px;';
    cancelBtn.textContent = '取消';
    contentDiv.appendChild(cancelBtn);

    dialog.appendChild(contentDiv);
    return dialog;
  }

  /**
   * Append box content to element safely using DOM APIs
   */
  private appendBoxContent(container: HTMLElement, isBankruptcy: boolean, isOutsideWindow: boolean, timeText: string): void {
    if (isBankruptcy) {
      const p1 = document.createElement('p');
      p1.style.cssText = 'margin-bottom: 8px; font-weight: bold; color: #ef4444;';
      p1.textContent = '❌ 破产锁定中';
      container.appendChild(p1);

      const p2 = document.createElement('p');
      p2.style.cssText = 'font-size: 14px; opacity: 0.8;';
      p2.textContent = '破产期间禁止所有娱乐消费。虽然当前是审批时间，但你已陷入债务破产，请先前往管理页偿还债务。';
      container.appendChild(p2);
    } else if (isOutsideWindow) {
      const p1 = document.createElement('p');
      p1.style.cssText = 'margin-bottom: 8px; font-weight: bold; color: #f59e0b;';
      p1.textContent = '⏰ 当前不在审批时间';
      container.appendChild(p1);

      const p2 = document.createElement('p');
      p2.style.cssText = 'font-size: 14px; opacity: 0.8;';
      p2.textContent = `距离下次审批时间：${timeText}`;
      container.appendChild(p2);

      const span = document.createElement('span');
      span.style.cssText = 'font-size: 12px; opacity: 0.6; margin-top: 8px;';
      span.textContent = '审批时间才能处理待审池视频';
      container.appendChild(span);
    } else {
      const p1 = document.createElement('p');
      p1.style.cssText = 'margin-bottom: 8px; font-weight: bold; color: #10b981;';
      p1.textContent = '✅ 当前是审批时间';
      container.appendChild(p1);

      const p2 = document.createElement('p');
      p2.style.cssText = 'font-size: 14px; opacity: 0.8;';
      p2.textContent = '你可以现在处理待审池视频。请先将此视频"加入待审池"，然后在管理页点击通过即可开始观看。';
      container.appendChild(p2);
    }
  }

  /**
   * Setup button event listeners
   */
  private setupButtonListeners(
    overlay: Element,
    metadata: VideoMetadata,
    onAddToLimbo: (metadata: VideoMetadata) => Promise<void>,
    onOpenManager: () => void,
    onDailyBypass: () => void
  ): void {
    const addBtn = overlay.querySelector('#bfm-add-limbo') as HTMLElement;
    const mgrBtn = overlay.querySelector('#bfm-open-manager') as HTMLElement;
    const bypassBtn = overlay.querySelector('#bfm-daily-bypass') as HTMLElement;
    
    if (addBtn) {
      addBtn.onmouseover = () => { addBtn.style.opacity = '0.8'; };
      addBtn.onmouseout = () => { addBtn.style.opacity = '1'; };
      addBtn.onfocus = () => { addBtn.style.outline = '2px solid white'; addBtn.style.outlineOffset = '2px'; };
      addBtn.onblur = () => { addBtn.style.outline = 'none'; };
      addBtn.onclick = () => onAddToLimbo(metadata);
    }
    
    if (mgrBtn) {
      mgrBtn.onmouseover = () => { mgrBtn.style.opacity = '0.8'; };
      mgrBtn.onmouseout = () => { mgrBtn.style.opacity = '1'; };
      mgrBtn.onfocus = () => { mgrBtn.style.outline = '2px solid white'; mgrBtn.style.outlineOffset = '2px'; };
      mgrBtn.onblur = () => { mgrBtn.style.outline = 'none'; };
      mgrBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenManager();
      };
    }

    if (bypassBtn) {
      bypassBtn.onmouseover = () => { bypassBtn.style.opacity = '0.8'; };
      bypassBtn.onmouseout = () => { bypassBtn.style.opacity = '1'; };
      bypassBtn.onfocus = () => { bypassBtn.style.outline = '2px solid white'; bypassBtn.style.outlineOffset = '2px'; };
      bypassBtn.onblur = () => { bypassBtn.style.outline = 'none'; };
      bypassBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDailyBypass();
      };
    }
  }

  /**
   * Show tag selection dialog
   */
  showTagSelectionDialog(metadata: VideoMetadata): Promise<VideoTag | null> {
    const existing = document.querySelector('.bfm-tag-dialog');
    if (existing) existing.remove();

    const dialog = this.createTagDialog(metadata);
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
