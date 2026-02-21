import type { ProtocolMap } from '@core/protocol';
import type { ExtensionConfig, VideoMetadata, VideoTag } from '@core/types';
import { StyleSimplificationService } from '@core/services';
import { sendMessage } from 'webext-bridge/content-script';
import './purify.css';

console.log('[Content] Script loaded');

// Wrapper for sendMessage to handle bfcache and extension context errors
async function safeSendMessage<T>(type: string, data?: unknown): Promise<T | null> {
  try {
    return await sendMessage(type as never, data as never) as T;
  } catch (error) {
    // Ignore bfcache-related errors
    if (error instanceof Error && error.message?.includes('back/forward cache')) {
      console.log('[Content] Ignoring bfcache error for:', type);
      return null;
    }
    // Handle extension context invalidated (extension reloaded/updated)
    if (error instanceof Error && error.message?.includes('Extension context invalidated')) {
      console.log('[Content] Extension context invalidated, reloading page...');
      // Reload the page to establish new connection
      window.location.reload();
      return null;
    }
    throw error;
  }
}

// Check if extension context is valid
function isExtensionContextValid(): boolean {
  try {
    // Try to access chrome.runtime
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

// Initialize style simplification service
const styleService = new StyleSimplificationService();

// Check extension context on load
if (!isExtensionContextValid()) {
  console.log('[Content] Extension context not available, skipping initialization');
  // In production, this shouldn't happen. In tests, we continue without throwing.
  // The functions below won't work properly without extension context anyway.
}

// Track current block state
let isBlocking = false;
let currentBvid: string | null = null;
let latestConfig: ProtocolMap['check-permission']['res']['config'] | null = null;
let latestVideoTag: VideoTag = 'ENTERTAINMENT';
let trackedVideo: HTMLVideoElement | null = null;
let watchIntervalId: number | null = null;
let lastWatchTick = 0;

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

// Extract live stream metadata from page with retry mechanism
async function extractLiveMetadataWithRetry(maxRetries = 5, delay = 1000): Promise<VideoMetadata | null> {
  console.log('[Content] Extracting live metadata with retry...');
  
  // Match both /live/123456 and /123456 (direct room ID)
  const roomIdMatch = window.location.pathname.match(/(?:\/live\/)?(\d+)/);
  if (!roomIdMatch) {
    console.log('[Content] No room ID found in pathname');
    return null;
  }

  const roomId = roomIdMatch[1];
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Content] Attempt ${attempt}/${maxRetries} to extract metadata`);
    console.log('[Content] Document ready state:', document.readyState);
    console.log('[Content] Head-info-vm exists:', !!document.querySelector('#head-info-vm'));
    
    // Try multiple selectors for live room title - using exact selectors provided by user
    const titleSelectors = [
      '#head-info-vm > div > div.lower-row > div.left-ctnr > div.live-title > div > div',
      '#head-info-vm .title-length-limit',
      '#head-info-vm .live-title',
      '[data-v-65e2b007]',
      '.live-title .text',
      '.title-length-limit',
      '.room-title',
      'h1.title',
      '[class*="title"]',
      'h1'
    ];
    
    let titleEl = null;
    for (const selector of titleSelectors) {
      try {
        titleEl = document.querySelector(selector);
        if (titleEl && titleEl.textContent?.trim()) {
          console.log('[Content] Found title with selector:', selector, 'text:', titleEl.textContent.trim());
          break;
        }
      } catch (e) {
        console.log('[Content] Error with selector:', selector, e);
      }
    }

    // Try multiple selectors for anchor/uploader name - using exact selectors provided by user
    const uploaderSelectors = [
      '#head-info-vm > div > div.upper-row > div.left-ctnr.left-header-area > a',
      '#head-info-vm .room-owner-username',
      '[data-v-4dfcc850]',
      '.room-owner-username',
      '.anchor-name',
      '.up-name',
      '.username',
      'a[href*="space"]'
    ];
    
    let uploaderEl = null;
    for (const selector of uploaderSelectors) {
      try {
        uploaderEl = document.querySelector(selector);
        if (uploaderEl && uploaderEl.textContent?.trim()) {
          console.log('[Content] Found uploader with selector:', selector, 'text:', uploaderEl.textContent.trim());
          break;
        }
      } catch (e) {
        console.log('[Content] Error with selector:', selector, e);
      }
    }

    // If we found both title and uploader, return the metadata
    if (titleEl?.textContent?.trim() && uploaderEl?.textContent?.trim()) {
      const titleText = titleEl.textContent.trim().slice(0, 50);
      const uploaderName = uploaderEl.textContent.trim();
      
      console.log('[Content] Successfully extracted metadata:');
      console.log('[Content] Title:', titleText);
      console.log('[Content] Uploader:', uploaderName);

      // Try to get cover image
      let coverUrl = '';
      const coverSelectors = [
        '.room-cover img',
        '.live-cover img',
        '[class*="cover"] img',
        'meta[property="og:image"]',
      ];

      for (const selector of coverSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          if (selector.includes('meta')) {
            coverUrl = (el as HTMLMetaElement).content || '';
          } else {
            coverUrl = (el as HTMLImageElement).src || '';
          }
          if (coverUrl) {
            console.log('[Content] Found cover with selector:', selector);
            break;
          }
        }
      }

      if (!coverUrl) {
        coverUrl = `https://i0.hdslb.com/bfs/live/${roomId}.jpg`;
      }

      return {
        bvid: `LIVE_${roomId}`,
        title: titleText,
        uploader: uploaderName,
        coverUrl,
        tag: 'ENTERTAINMENT' as VideoTag,
        addedAt: Date.now(),
      };
    }

    // If not found and not last attempt, wait and retry
    if (attempt < maxRetries) {
      console.log(`[Content] Metadata not ready, waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('[Content] Failed to extract metadata after all retries');
  return null;
}

// Extract video metadata from page
function extractVideoMetadata(collectionDetectionEnabled: boolean): VideoMetadata | null {
  const bvidMatch = window.location.pathname.match(/\/video\/(BV\w+)/);
  if (!bvidMatch) return null;

  const bvid = bvidMatch[1];
  const titleEl = document.querySelector('h1.video-title, .video-title, h1.title');
  const uploaderEl = document.querySelector('.up-name, .username, .up-info__name, a.up-name');

  let titleText = titleEl?.textContent?.trim().slice(0, 50) || 'Unknown';

  if (collectionDetectionEnabled) {
    const collectionTitleEl = document.querySelector('.video-collection-title, .collection-title, .multi-page-title');
    if (collectionTitleEl?.textContent) {
      titleText = collectionTitleEl.textContent.trim().slice(0, 50);
    }
  }

  // Try multiple selectors for cover image
  let coverUrl = '';
  const coverSelectors = [
    'img[src*="hdslb.com"]',
    'img[src*="bilibili.com"]',
    '.video-cover img',
    '.bilibili-player-video-cover img',
    '.bpx-player-video-cover img',
    '.cover img',
    'meta[property="og:image"]',
  ];

  for (const selector of coverSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      if (selector.includes('meta')) {
        coverUrl = (el as HTMLMetaElement).content || '';
      } else {
        coverUrl = (el as HTMLImageElement).src || '';
      }
      if (coverUrl) break;
    }
  }

  if (!coverUrl && bvid) {
    coverUrl = `https://i0.hdslb.com/bfs/archive/${bvid}.jpg`;
  }

  return {
    bvid,
    title: titleText,
    uploader: uploaderEl?.textContent?.trim() || 'Unknown',
    coverUrl,
    tag: 'ENTERTAINMENT',
    addedAt: Date.now(),
  };
}

// Check permission and apply block if needed
async function checkPermission(): Promise<void> {
  console.log('[Content] Checking permission...');
  console.log('[Content] isLivePage:', isLivePage());
  console.log('[Content] isVideoPlayerPage:', styleService.isVideoPlayerPage());
  
  const configForExtraction = latestConfig || DEFAULT_CONTENT_CONFIG;
  
  // Try to extract video metadata first, then live metadata
  let metadata = extractVideoMetadata(configForExtraction.collectionDetectionEnabled);
  console.log('[Content] Video metadata:', metadata);
  
  if (!metadata && isLivePage()) {
    console.log('[Content] Extracting live metadata with retry...');
    metadata = await extractLiveMetadataWithRetry(10, 1000);
    console.log('[Content] Live metadata:', metadata);
  }
  
  if (!metadata) {
    console.log('[Content] No metadata found, removing block');
    removeBlock();
    return;
  }

  currentBvid = metadata.bvid;
  console.log('[Content] Current BVID:', currentBvid);

  try {
    console.log('[Content] Sending check-permission request for:', metadata.bvid);
    const result = await safeSendMessage<ProtocolMap['check-permission']['res']>('check-permission', {
      bvid: metadata.bvid,
      uploaderName: metadata.uploader,
      title: metadata.title
    } as ProtocolMap['check-permission']['req']);

    if (!result) {
      console.log('[Content] Failed to get permission result, allowing video');
      removeBlock();
      return;
    }

    console.log('[Content] Permission result:', result);

    latestConfig = result.config || latestConfig || DEFAULT_CONTENT_CONFIG;
    latestVideoTag = result.videoTag || 'ENTERTAINMENT';
    
    // Apply style simplification
    applyStyleSimplification();
    
    setupVideoTracking();

    // Check if uploader is in allowlist
    if (result.uploaderAllowed) {
      console.log('[Content] Uploader is in allowlist, allowing video');
      removeBlock();
      return;
    }

    if (!result.allowed) {
      console.log('[Content] Permission denied, showing block overlay');
      // Video is not approved - show block overlay
      // Check if it's outside review window (for messaging purposes)
      const allowFuseOutsideWindow = Boolean(latestConfig?.instantBreakFuse);
      const inReviewWindow = Boolean(result.inReviewWindow);
      showBlockOverlay(metadata, result.reason, {
        inReviewWindow,
        timeUntilWindow: result.timeUntilWindow || 0,
      }, {
        allowFuse: inReviewWindow || allowFuseOutsideWindow,
        isBankruptcy: result.reason === 'BANKRUPTCY',
      });
    } else {
      console.log('[Content] Permission granted, removing block');
      // Video is approved - remove block
      removeBlock();
    }
  } catch (error) {
    console.error('[Content] Failed to check permission:', error);
  }
}

// Apply hard block - hide video player
function applyHardBlock(): void {
  if (isBlocking) return;
  isBlocking = true;

  console.log('[Content] Applying hard block');

  // Hide video player elements (including live stream players)
  const playerSelectors = [
    '.bilibili-player',
    '.bpx-player-container',
    '#bilibili-player',
    '.player-container',
    // Live stream specific selectors
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
      console.log('[Content] Hiding player:', selector);
    });
  });

  // Stop any playing video
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    video.pause();
    video.currentTime = 0;
    console.log('[Content] Stopped video');
  });
}

// Remove block - restore video player
function removeBlock(): void {
  if (!isBlocking) return;
  isBlocking = false;

  console.log('[Content] Removing block');

  // Remove overlay
  const overlay = document.querySelector('.bilibili-focus-mode-block-overlay');
  if (overlay) overlay.remove();

  // Show video player (including live stream players)
  const playerSelectors = [
    '.bilibili-player',
    '.bpx-player-container',
    '#bilibili-player',
    '.player-container',
    // Live stream specific selectors
    '#live-player',
    '.live-player',
    '[class*="live-player"]',
    '[class*="player"]',
    '#player',
  ];

  playerSelectors.forEach(selector => {
    const players = document.querySelectorAll(selector);
    players.forEach(player => {
      (player as HTMLElement).style.display = '';
    });
  });
}

// Show block overlay
function showBlockOverlay(
  metadata: VideoMetadata,
  reason: string,
  windowInfo: { inReviewWindow: boolean; timeUntilWindow: number },
  fuseInfo: { allowFuse: boolean; isBankruptcy: boolean }
): void {
  applyHardBlock();

  // Remove existing overlay
  const existing = document.querySelector('.bilibili-focus-mode-block-overlay');
  if (existing) existing.remove();

  const isOutsideWindow = !windowInfo.inReviewWindow;
  const timeText = formatTime(windowInfo.timeUntilWindow);

  const overlay = document.createElement('div');
  overlay.className = 'bilibili-focus-mode-block-overlay';

  // Different UI based on whether we're in review window or not
  if (isOutsideWindow) {
    // Outside review window - can only use fuse or add to limbo
    overlay.innerHTML = `
      <div style="text-align: center; max-width: 500px; padding: 20px;">
        <h2 style="margin-bottom: 16px; font-size: 24px;">🔒 视频未审批</h2>
        <p style="margin-bottom: 8px; font-size: 16px; opacity: 0.9;">${metadata.title}</p>
        <p style="margin-bottom: 24px; font-size: 14px; opacity: 0.7;">UP主: ${metadata.uploader}</p>
        
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; border-radius: 8px;">
          <p style="margin-bottom: 8px; font-weight: bold; color: #f59e0b;">⏰ 当前不在审批时间</p>
          <p style="font-size: 14px; opacity: 0.8;">距离下次审批时间: ${timeText}</p>
          <p style="font-size: 12px; opacity: 0.6; margin-top: 8px;">
            审批时间才能处理待审池视频<br>
            现在可以选择：加入待审池 或 使用熔断码临时观看
          </p>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="bfm-add-limbo" style="padding: 10px 20px; background: #00aeec; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 14px;">
            加入待审池
          </button>
          ${fuseInfo.allowFuse
        ? '<button id="bfm-use-fuse" style="padding: 10px 20px; background: #f59e0b; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 14px;">使用熔断码</button>'
        : '<span style="padding: 10px 20px; border: 1px solid #666; border-radius: 6px; color: #777; font-size: 14px;">熔断码已禁用</span>'
      }
          <button id="bfm-open-manager" style="padding: 10px 20px; background: transparent; border: 1px solid white; border-radius: 6px; color: white; cursor: pointer; font-size: 14px;">
            打开管理页
          </button>
        </div>
      </div>
    `;
  } else {
    // In review window - can add to limbo (will be processed later)
    overlay.innerHTML = `
      <div style="text-align: center; max-width: 500px; padding: 20px;">
        <h2 style="margin-bottom: 16px; font-size: 24px;">🔒 视频未审批</h2>
        <p style="margin-bottom: 8px; font-size: 16px; opacity: 0.9;">${metadata.title}</p>
        <p style="margin-bottom: 24px; font-size: 14px; opacity: 0.7;">UP主: ${metadata.uploader}</p>
        
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 8px;">
          <p style="margin-bottom: 8px; font-weight: bold;">${getReasonText(reason)}</p>
          <p style="font-size: 12px; opacity: 0.6; margin-top: 8px;">
            ✓ 当前是审批时间，可以前往管理页处理待审池<br>
            或使用熔断码临时观看
          </p>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="bfm-add-limbo" style="padding: 10px 20px; background: #00aeec; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 14px;">
            加入待审池
          </button>
          <button id="bfm-use-fuse" style="padding: 10px 20px; background: #f59e0b; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 14px;">
            使用熔断码
          </button>
          <button id="bfm-open-manager" style="padding: 10px 20px; background: transparent; border: 1px solid white; border-radius: 6px; color: white; cursor: pointer; font-size: 14px;">
            打开管理页
          </button>
        </div>
      </div>
    `;
  }

  document.body.appendChild(overlay);

  // Add event listeners
  overlay.querySelector('#bfm-add-limbo')?.addEventListener('click', () => {
    addToLimbo(metadata);
  });

  overlay.querySelector('#bfm-use-fuse')?.addEventListener('click', () => {
    showFuseInputDialog(metadata, fuseInfo.isBankruptcy);
  });

  overlay.querySelector('#bfm-open-manager')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openManagerPage();
  });
}

// Show fuse code input dialog
async function showFuseInputDialog(metadata: VideoMetadata, isBankruptcy: boolean): Promise<void> {
  // Remove existing dialog
  const existing = document.querySelector('.bfm-fuse-dialog');
  if (existing) existing.remove();

  const dialog = document.createElement('div');
  dialog.className = 'bfm-fuse-dialog';
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
    <div style="background: #1a1a2e; padding: 24px; border-radius: 12px; max-width: 450px; width: 90%;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: white;">输入熔断码</h3>
      <p style="margin: 0 0 20px 0; color: #aaa; font-size: 14px;">
        使用熔断码临时观看将产生额外债务<br>
        <span style="color: #f59e0b;">提示: 熔断码可在管理页申请</span>
      </p>
      
      <input 
        type="text" 
        id="bfm-fuse-input" 
        placeholder="XXXX-XXXX-XXXX-XXXX"
        style="width: 100%; padding: 12px; background: #2a2a3e; border: 1px solid #444; border-radius: 8px; color: white; font-size: 16px; font-family: monospace; margin-bottom: 16px; text-align: center;"
      >
      
      <div id="bfm-fuse-error" style="color: #ef4444; font-size: 14px; margin-bottom: 16px; display: none;">
        熔断码错误，请检查后重试
      </div>
      
      <div style="display: flex; gap: 12px; margin-bottom: 12px;">
        <button id="bfm-fuse-apply" style="flex: 1; padding: 10px; background: #2563eb; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 14px;">
          申请熔断码
        </button>
      </div>
      <div style="display: flex; gap: 12px;">
        <button id="bfm-fuse-cancel" style="flex: 1; padding: 12px; background: transparent; border: 1px solid #666; border-radius: 8px; color: #aaa; cursor: pointer; font-size: 14px;">
          取消
        </button>
        <button id="bfm-fuse-submit" style="flex: 1; padding: 12px; background: #f59e0b; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 14px;">
          确认
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  const input = dialog.querySelector('#bfm-fuse-input') as HTMLInputElement;
  const errorDiv = dialog.querySelector('#bfm-fuse-error') as HTMLDivElement;

  input.focus();

  return new Promise((resolve) => {
    const closeDialog = () => {
      dialog.remove();
      resolve();
    };

    dialog.querySelector('#bfm-fuse-cancel')?.addEventListener('click', closeDialog);

    dialog.querySelector('#bfm-fuse-apply')?.addEventListener('click', async () => {
      try {
        const response = await safeSendMessage<ProtocolMap['apply-fuse']['res']>('apply-fuse', {
          metadata: {
            bvid: metadata.bvid,
            title: metadata.title,
            uploader: metadata.uploader,
            coverUrl: metadata.coverUrl,
            tag: metadata.tag,
            addedAt: metadata.addedAt,
          },
          isBankruptcy,
        } as ProtocolMap['apply-fuse']['req']);

        if (!response || !response.success || !response.fuseCode) {
          errorDiv.style.display = 'block';
          errorDiv.textContent = response?.message || '申请失败';
          return;
        }

        input.value = response.fuseCode;
        errorDiv.style.display = 'block';
        errorDiv.style.color = '#10b981';
        errorDiv.textContent = '熔断码已生成，请确认使用';
      } catch (error) {
        console.error('[Content] Failed to apply fuse:', error);
        errorDiv.style.display = 'block';
        errorDiv.textContent = '申请失败，请重试';
      }
    });

    dialog.querySelector('#bfm-fuse-submit')?.addEventListener('click', async () => {
      const fuseCode = input.value.trim().toUpperCase();
      if (!fuseCode) return;

      try {
        const result = await safeSendMessage<{ success: boolean; message: string }>('verify-fuse', {
          bvid: metadata.bvid,
          fuseCode
        } as ProtocolMap['verify-fuse']['req']);

        if (result?.success) {
          dialog.remove();
          removeBlock();
          alert('熔断码验证成功！可以观看视频（已记录债务）');
        } else {
          errorDiv.style.display = 'block';
          errorDiv.style.color = '#ef4444';
          errorDiv.textContent = result?.message || '熔断码错误';
        }
      } catch (error) {
        console.error('[Content] Failed to verify fuse:', error);
        errorDiv.style.display = 'block';
        errorDiv.style.color = '#ef4444';
        errorDiv.textContent = '验证失败，请重试';
      }
    });

    // Allow Enter key to submit
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        dialog.querySelector('#bfm-fuse-submit')?.dispatchEvent(new Event('click'));
      }
    });

    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });
  });
}

// Format milliseconds to readable time
function formatTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

function getReasonText(reason: string): string {
  const reasons: Record<string, string> = {
    'NO_PERMISSION': '视频未审批，请先加入待审池',
    'COOLING_WAITING': '冷静期中，请等待',
    'EXPIRED': '许可已过期',
    'BANKRUPTCY': '破产锁定中',
  };
  return reasons[reason] || '未知原因';
}

async function addToLimbo(metadata: VideoMetadata): Promise<void> {
  if (!chrome.runtime?.id) {
    console.error('[Content] Extension context invalidated');
    alert('扩展已失效，请刷新页面或重新加载扩展');
    return;
  }

  const tagSelection = await showTagSelectionDialog(metadata);
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

    const result = await safeSendMessage<{ success: boolean; limboCount: number }>('add-to-limbo', payload as { [key: string]: string | number | boolean | null | { [key: string]: string | number | boolean | null } });

    if (result?.success) {
      const tagText = tagSelection === 'LEARNING' ? '学习' : '娱乐';
      alert(`已加入待审池！标签：${tagText}\n请在审批时间前往管理页处理`);

      const overlay = document.querySelector('.bilibili-focus-mode-block-overlay');
      if (overlay) {
        const statusText = overlay.querySelector('p:nth-of-type(3)');
        if (statusText) {
          statusText.textContent = `状态: 已加入待审池（${tagText}），等待审批时间处理`;
        }
      }
    } else if (result) {
      alert('添加失败，请重试');
    }
  } catch (error) {
    console.error('[Content] Failed to add to limbo:', error);
    alert('添加失败，请重试');
  }
}

function showTagSelectionDialog(metadata: VideoMetadata): Promise<'LEARNING' | 'ENTERTAINMENT' | null> {
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
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <button id="bfm-tag-learning" style="flex: 1; padding: 12px; background: #10b981; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 14px;">
          📚 学习
        </button>
        <button id="bfm-tag-entertainment" style="flex: 1; padding: 12px; background: #f59e0b; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 14px;">
          🎮 娱乐
        </button>
      </div>
      <button id="bfm-tag-cancel" style="width: 100%; padding: 10px; background: transparent; border: 1px solid #666; border-radius: 8px; color: #aaa; cursor: pointer; font-size: 14px;">
        取消
      </button>
    </div>
  `;

  document.body.appendChild(dialog);

  return new Promise<'LEARNING' | 'ENTERTAINMENT' | null>((resolve) => {
    dialog.querySelector('#bfm-tag-learning')?.addEventListener('click', () => {
      dialog.remove();
      resolve('LEARNING');
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

function openManagerPage(): void {
  console.log('[Bilibili Focus Mode] Opening manager page...');

  const optionsUrl = chrome.runtime.getURL('src/manager/index.html');

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

// Apply style simplification based on current page
async function applyStyleSimplification(): Promise<void> {
  console.log('[Content] Applying style simplification...');
  console.log('[Content] Current page:', window.location.pathname);
  console.log('[Content] isHomepage:', styleService.isHomepage());
  console.log('[Content] isDynamicPage:', styleService.isDynamicPage());
  console.log('[Content] isVideoPlayerPage:', styleService.isVideoPlayerPage());

  try {
    const response = await safeSendMessage<{ config: ExtensionConfig }>('get-full-config', {});
    console.log('[Content] Got config response:', response);

    if (!response) {
      console.log('[Content] Failed to get config');
      return;
    }

    const config = response.config;

    if (!config) {
      console.log('[Content] No config found');
      return;
    }

    console.log('[Content] Config loaded:', {
      homepageSimplification: config.homepageSimplification,
      dynamicSimplification: config.dynamicSimplification,
      videoPlayerSimplification: config.videoPlayerSimplification,
      liveSimplification: config.liveSimplification,
    });

    // Always apply global styles first
    styleService.applyGlobalStyles();

    // Apply video player simplification
    if (styleService.isVideoPlayerPage() && config.videoPlayerSimplification?.enabled) {
      console.log('[Content] Applying video player simplification');
      const vps = config.videoPlayerSimplification;
      styleService.applyVideoPlayerSimplification({
        hideComments: vps.hideComments,
        hideRecommendations: vps.hideRecommendations,
        hideDanmaku: vps.hideDanmaku,
        hideSidebar: vps.hideSidebar,
        hideAds: vps.hideAds,
        minimalPlayer: vps.minimalPlayer,
      });
    }

    // Apply homepage simplification
    if (styleService.isHomepage() && config.homepageSimplification?.enabled) {
      console.log('[Content] Applying homepage simplification');
      styleService.applyHomepageSimplification(config.homepageSimplification);
    }

    // Apply dynamic page simplification
    if (styleService.isDynamicPage() && config.dynamicSimplification?.enabled) {
      console.log('[Content] Applying dynamic page simplification');
      styleService.applyDynamicSimplification(config.dynamicSimplification);
    }

    // Apply live streaming page simplification
    if (styleService.isLivePage() && config.liveSimplification?.enabled) {
      console.log('[Content] Applying live page simplification');
      const ls = config.liveSimplification;
      styleService.applyLiveSimplification({
        hideComments: ls.hideComments,
        hideGiftEffects: ls.hideGiftEffects,
        hideAds: ls.hideAds,
        hideSidebar: ls.hideSidebar,
        minimalPlayer: ls.minimalPlayer,
      });
    }
  } catch (error) {
    console.log('[Content] Failed to apply style simplification:', error);
  }
}

// Check if current page is a live streaming page
function isLivePage(): boolean {
  return window.location.pathname.startsWith('/live/') ||
         window.location.host === 'live.bilibili.com' ||
         /^\/\d+$/.test(window.location.pathname);
}

// Check if current page is search page
function isSearchPage(): boolean {
  return window.location.pathname.startsWith('/search') ||
         window.location.host === 'search.bilibili.com';
}

// Check if we should redirect to search (exclude video, dynamic, live, and search pages)
async function checkHomepageRedirect(): Promise<void> {
  try {
    const response = await safeSendMessage<{ config: ExtensionConfig }>('get-full-config', {});
    if (!response) {
      console.log('[Content] Failed to get config for redirect check');
      return;
    }
    
    const config = response.config;
    if (config?.homepageSimplification?.redirectToSearch) {
      // Don't redirect if on video page, dynamic page, live page, or already on search page
      if (styleService.isVideoPlayerPage() || styleService.isDynamicPage() || isLivePage() || isSearchPage()) {
        console.log('[Content] Not redirecting - on video/dynamic/live/search page');
        return;
      }
      
      console.log('[Content] Redirecting to search page');
      window.location.replace('https://search.bilibili.com/');
    }
  } catch (error) {
    console.error('[Content] Failed to check homepage redirect:', error);
  }
}

// Watch for navigation changes (SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkHomepageRedirect();
    applyStyleSimplification();
    setTimeout(checkPermission, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Initial check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkHomepageRedirect();
    applyStyleSimplification();
    checkPermission();
  });
} else {
  checkHomepageRedirect();
  applyStyleSimplification();
  checkPermission();
}

// Periodically re-check permission (for time window changes)
setInterval(() => {
  if (currentBvid) {
    checkPermission();
  }
}, 60000); // Check every minute

function setupVideoTracking(): void {
  const video = document.querySelector('video');
  if (!video || video === trackedVideo) return;

  if (trackedVideo) {
    trackedVideo.removeEventListener('play', handlePlay);
    trackedVideo.removeEventListener('pause', handlePause);
    trackedVideo.removeEventListener('ended', handleEnded);
  }

  trackedVideo = video;
  trackedVideo.addEventListener('play', handlePlay);
  trackedVideo.addEventListener('pause', handlePause);
  trackedVideo.addEventListener('ended', handleEnded);
}

function handlePlay(): void {
  if (!latestConfig?.debtEnabled) return;
  startWatchTimer();
}

function handlePause(): void {
  stopWatchTimer(true);
}

function handleEnded(): void {
  stopWatchTimer(true);
  if (!currentBvid) return;
  safeSendMessage('watch-ended', {
    bvid: currentBvid,
    endedAt: Date.now(),
  } as ProtocolMap['watch-ended']['req']).catch((error) => {
    console.error('[Content] Failed to report watch end:', error);
  });
}

function startWatchTimer(): void {
  if (watchIntervalId) return;
  lastWatchTick = Date.now();
  watchIntervalId = window.setInterval(() => {
    sendDebtDelta();
  }, 60000);
}

function stopWatchTimer(sendFinal: boolean): void {
  if (!watchIntervalId) return;
  clearInterval(watchIntervalId);
  watchIntervalId = null;
  if (sendFinal) {
    sendDebtDelta();
  }
}

function sendDebtDelta(): void {
  if (!latestConfig?.debtEnabled) return;
  const now = Date.now();
  const minutes = (now - lastWatchTick) / 60000;
  if (minutes <= 0) return;
  lastWatchTick = now;

  safeSendMessage('update-debt', {
    minutes,
    tag: latestVideoTag,
  } as ProtocolMap['update-debt']['req']).catch((error) => {
    console.error('[Content] Failed to update debt:', error);
  });
}
