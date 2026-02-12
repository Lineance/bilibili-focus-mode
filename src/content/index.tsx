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
  const titleEl = document.querySelector('h1.video-title, .video-title');
  const uploaderEl = document.querySelector('.up-name, .username');
  const coverEl = document.querySelector('.video-cover img, .bilibili-player-video-cover img') as HTMLImageElement;

  return {
    bvid,
    title: titleEl?.textContent?.trim().slice(0, 50) || 'Unknown',
    uploader: uploaderEl?.textContent?.trim() || 'Unknown',
    coverUrl: coverEl?.src || '',
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
    try {
      // Content script cannot use chrome.runtime.openOptionsPage
      // Use chrome.tabs.create instead via background script or open directly
      const optionsUrl = chrome.runtime.getURL('src/manager/index.html');
      console.log('[Bilibili Focus Mode] Options URL:', optionsUrl);
      
      // Try to use background script to open tab
      chrome.runtime.sendMessage({ action: 'openOptionsPage' }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          console.log('[Bilibili Focus Mode] Background open failed, using direct open');
          // Fallback: open in new tab
          window.open(optionsUrl, '_blank');
        }
      });
    } catch (error) {
      console.error('[Bilibili Focus Mode] Exception:', error);
      // Final fallback
      window.open(chrome.runtime.getURL('src/manager/index.html'), '_blank');
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
  try {
    const payload = {
      metadata: {
        bvid: metadata.bvid,
        title: metadata.title,
        uploader: metadata.uploader,
        coverUrl: metadata.coverUrl,
        tag: metadata.tag,
        addedAt: metadata.addedAt,
      },
      sourceUrl: window.location.href,
    };
    const result = await sendMessage('add-to-limbo', payload as { [key: string]: string | number | boolean | null | { [key: string]: string | number | boolean | null } }) as { success: boolean; limboCount: number };

    if (result.success) {
      alert('已加入待审池！');
      document.querySelector('.bilibili-focus-mode-block-overlay')?.remove();
    } else {
      alert('待审池已满，请先处理现有项目');
    }
  } catch (error) {
    console.error('[Content] Failed to add to limbo:', error);
    alert('添加失败，请重试');
  }
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
