import { sendMessage } from 'webext-bridge/content-script';
import type { VideoMetadata, PermissionResult } from '@core/types';
import type { ProtocolMap } from '@core/protocol';
import './purify.css';

console.log('[Content] Script loaded');

// Extract video metadata from page
function extractVideoMetadata(): VideoMetadata | null {
  const bvidMatch = window.location.pathname.match(/\/video\/(BV\w+)/);
  if (!bvidMatch) return null;

  const bvid = bvidMatch[1];
  const titleEl = document.querySelector('h1.video-title, .video-title, h1.title');
  const uploaderEl = document.querySelector('.up-name, .username, .up-info__name, a.up-name');
  
  // Try multiple selectors for cover image
  let coverUrl = '';
  const coverSelectors = [
    'img[src*="hdslb.com"]',  // Bilibili CDN - most reliable
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
  
  // Fallback: try to construct from bvid
  if (!coverUrl && bvid) {
    // Bilibili cover URL pattern (this is a guess, may not work)
    coverUrl = `https://i0.hdslb.com/bfs/archive/${bvid}.jpg`;
  }

  return {
    bvid,
    title: titleEl?.textContent?.trim().slice(0, 50) || 'Unknown',
    uploader: uploaderEl?.textContent?.trim() || 'Unknown',
    coverUrl,
    tag: 'ENTERTAINMENT', // Default, user must choose
    addedAt: Date.now(),
  };
}

// Check permission and show overlay if needed
async function checkPermission(): Promise<void> {
  const metadata = extractVideoMetadata();
  if (!metadata) return;

  try {
    const result = await sendMessage('check-permission', { bvid: metadata.bvid } as ProtocolMap['check-permission']['req']) as PermissionResult;
    
    if (!result.allowed) {
      showBlockOverlay(metadata, result.reason);
    }
  } catch (error) {
    console.error('[Content] Failed to check permission:', error);
  }
}

// Show block overlay
function showBlockOverlay(metadata: VideoMetadata, reason: string): void {
  // Remove existing overlay
  const existing = document.querySelector('.bilibili-focus-mode-block-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'bilibili-focus-mode-block-overlay';
  overlay.innerHTML = `
    <div style="text-align: center; max-width: 500px; padding: 20px;">
      <h2 style="margin-bottom: 16px; font-size: 24px;">🔒 视频已拦截</h2>
      <p style="margin-bottom: 8px; font-size: 16px; opacity: 0.9;">${metadata.title}</p>
      <p style="margin-bottom: 24px; font-size: 14px; opacity: 0.7;">UP主: ${metadata.uploader}</p>
      <p style="margin-bottom: 24px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px;">
        状态: ${getReasonText(reason)}
      </p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="bfm-add-limbo" style="padding: 10px 20px; background: #00aeec; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 14px;">
          加入待审池
        </button>
        <button id="bfm-open-manager" style="padding: 10px 20px; background: transparent; border: 1px solid white; border-radius: 6px; color: white; cursor: pointer; font-size: 14px;">
          打开管理页
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add event listeners
  overlay.querySelector('#bfm-add-limbo')?.addEventListener('click', () => {
    addToLimbo(metadata);
  });

  overlay.querySelector('#bfm-open-manager')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Bilibili Focus Mode] Opening manager page...');
    
    const optionsUrl = chrome.runtime.getURL('src/manager/index.html');
    
    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      console.error('[Bilibili Focus Mode] Extension context invalidated');
      alert('扩展已失效，请刷新页面或重新加载扩展');
      return;
    }
    
    try {
      // Try to use background script to open tab
      chrome.runtime.sendMessage({ action: 'openOptionsPage' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('[Bilibili Focus Mode] Background open failed:', chrome.runtime.lastError);
          // Fallback: open in new tab directly
          window.open(optionsUrl, '_blank');
        } else if (!response?.success) {
          console.log('[Bilibili Focus Mode] Background returned failure');
          window.open(optionsUrl, '_blank');
        }
      });
    } catch (error) {
      console.error('[Bilibili Focus Mode] Exception:', error);
      // Final fallback
      window.open(optionsUrl, '_blank');
    }
  });
}

function getReasonText(reason: string): string {
  const reasons: Record<string, string> = {
    'NO_PERMISSION': '未获得观看许可',
    'COOLING_WAITING': '冷静期中，请等待',
    'EXPIRED': '许可已过期',
    'BANKRUPTCY': '破产锁定中',
  };
  return reasons[reason] || '未知原因';
}

async function addToLimbo(metadata: VideoMetadata): Promise<void> {
  // Check if extension context is valid
  if (!chrome.runtime?.id) {
    console.error('[Content] Extension context invalidated');
    alert('扩展已失效，请刷新页面或重新加载扩展');
    return;
  }

  // Show tag selection dialog
  const tagSelection = await showTagSelectionDialog(metadata);
  if (!tagSelection) {
    return; // User cancelled
  }

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
    
    console.log('[Content] Sending add-to-limbo message:', payload);
    
    const result = await sendMessage('add-to-limbo', payload as { [key: string]: string | number | boolean | null | { [key: string]: string | number | boolean | null } }) as { success: boolean; limboCount: number };
    
    console.log('[Content] Received response:', result);

    if (result.success) {
      const tagText = tagSelection === 'LEARNING' ? '学习' : '娱乐';
      alert(`已加入待审池！标签：${tagText}\n请前往管理页审查`);
      // Keep the block overlay - video should remain blocked until reviewed
      // Update the overlay to show it's now in limbo
      const overlay = document.querySelector('.bilibili-focus-mode-block-overlay');
      if (overlay) {
        const statusText = overlay.querySelector('p:nth-of-type(3)');
        if (statusText) {
          statusText.textContent = `状态: 已加入待审池（${tagText}），请前往管理页审查`;
        }
      }
    } else {
      alert('待审池已满，请先处理现有项目');
    }
  } catch (error) {
    console.error('[Content] Failed to add to limbo:', error);
    if (error instanceof Error && error.message.includes('Extension context invalidated')) {
      alert('扩展已失效，请刷新页面或重新加载扩展');
    } else {
      alert('添加失败，请重试');
    }
  }
}

// Show tag selection dialog
function showTagSelectionDialog(metadata: VideoMetadata): Promise<'LEARNING' | 'ENTERTAINMENT' | null> {
  // Remove existing dialog
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
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
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

    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
        resolve(null);
      }
    });
  });
}

// Watch for navigation changes (SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(checkPermission, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Initial check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkPermission);
} else {
  checkPermission();
}
