import type { ProtocolMap } from '@core/protocol';
import type { VideoMetadata } from '@core/types';
import { StyleSimplificationService } from '@core/services';
import { sendMessage } from 'webext-bridge/content-script';
import { VideoMetadataExtractor } from './services/VideoMetadataExtractor';
import { BlockOverlayManager } from './components/BlockOverlay';
import { VideoTracker } from './services/VideoTracker';
import { PermissionChecker } from './services/PermissionChecker';
import './purify.css';

console.log('[Content] Script loaded');

async function safeSendMessage<T>(type: string, data?: unknown): Promise<T | null> {
  try {
    return await sendMessage(type as never, data as never) as T;
  } catch (error) {
    if (error instanceof Error && error.message?.includes('back/forward cache')) {
      console.log('[Content] Ignoring bfcache error for:', type);
      return null;
    }
    if (error instanceof Error && error.message?.includes('Extension context invalidated')) {
      console.log('[Content] Extension context invalidated, reloading page...');
      window.location.reload();
      return null;
    }
    throw error;
  }
}

function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

const metadataExtractor = new VideoMetadataExtractor();
const blockOverlayManager = new BlockOverlayManager();
const permissionChecker = new PermissionChecker(safeSendMessage);
const videoTracker = new VideoTracker(safeSendMessage, () => permissionChecker.getCurrentBvid());

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

async function addToLimbo(metadata: VideoMetadata): Promise<void> {
  if (!chrome.runtime?.id) {
    console.error('[Content] Extension context invalidated');
    alert('扩展已失效，请刷新页面或重新加载扩展');
    return;
  }

  const tagSelection = await blockOverlayManager.showTagSelectionDialog(metadata);
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
    } else if (result) {
      alert('添加失败，请重试');
    }
  } catch (error) {
    console.error('[Content] Failed to add to limbo:', error);
    alert('添加失败，请重试');
  }
}

async function checkPermission(): Promise<void> {
  console.log('[Content] Checking permission...');
  
  const configForExtraction = permissionChecker.getLatestConfig() || DEFAULT_CONTENT_CONFIG;
  
  let metadata = metadataExtractor.extractVideoMetadata(configForExtraction.collectionDetectionEnabled);
  
  if (!metadata && metadataExtractor.isLivePage()) {
    console.log('[Content] Extracting live metadata with retry...');
    metadata = await metadataExtractor.extractLiveMetadataWithRetry(10, 1000);
  }
  
  if (!metadata) {
    console.log('[Content] No metadata found, removing block');
    blockOverlayManager.remove();
    return;
  }

  const result = await permissionChecker.checkPermission(metadata, DEFAULT_CONTENT_CONFIG);

  if (!result) {
    console.log('[Content] Failed to get permission result, allowing video');
    blockOverlayManager.remove();
    return;
  }

  videoTracker.updateConfig(result.config || null);
  videoTracker.updateVideoTag(result.videoTag || 'ENTERTAINMENT');
  videoTracker.setupVideoTracking();

  if (result.uploaderAllowed) {
    console.log('[Content] Uploader is in allowlist, allowing video');
    blockOverlayManager.remove();
    return;
  }

  if (!result.allowed) {
    console.log('[Content] Permission denied, showing block overlay');
    const allowFuseOutsideWindow = Boolean(result.config?.instantBreakFuse);
    const inReviewWindow = result.inReviewWindow;
    blockOverlayManager.show(
      metadata,
      result.reason,
      {
        inReviewWindow,
        timeUntilWindow: result.timeUntilWindow || 0,
      },
      {
        allowFuse: inReviewWindow || allowFuseOutsideWindow,
        isBankruptcy: result.reason === 'BANKRUPTCY',
      },
      addToLimbo,
      () => blockOverlayManager.openManagerPage()
    );
  } else {
    console.log('[Content] Permission granted, removing block');
    blockOverlayManager.remove();
  }
}

async function applyStyleSimplification(): Promise<void> {
  console.log('[Content] Applying style simplification...');

  try {
    const config = await permissionChecker.getFullConfig();
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

    const styleService = new StyleSimplificationService();
    styleService.applyGlobalStyles();

    if (styleService.isVideoPlayerPage() && config.videoPlayerSimplification?.enabled) {
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

    if (styleService.isHomepage() && config.homepageSimplification?.enabled) {
      styleService.applyHomepageSimplification(config.homepageSimplification);
    }

    if (styleService.isDynamicPage() && config.dynamicSimplification?.enabled) {
      styleService.applyDynamicSimplification(config.dynamicSimplification);
    }

    if (styleService.isLivePage() && config.liveSimplification?.enabled) {
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

async function checkHomepageRedirect(): Promise<void> {
  try {
    const config = await permissionChecker.getFullConfig();
    if (config?.homepageSimplification?.redirectToSearch) {
      const styleService = new StyleSimplificationService();
      if (styleService.isVideoPlayerPage() || styleService.isDynamicPage() || metadataExtractor.isLivePage() || metadataExtractor.isSearchPage()) {
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

if (typeof window !== 'undefined' && window.location) {
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const url = window.location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      checkHomepageRedirect();
      applyStyleSimplification();
      setTimeout(checkPermission, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
}

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

setInterval(() => {
  if (permissionChecker.getCurrentBvid()) {
    checkPermission();
  }
}, 60000);

if (!isExtensionContextValid()) {
  console.log('[Content] Extension context not available, skipping initialization');
}
