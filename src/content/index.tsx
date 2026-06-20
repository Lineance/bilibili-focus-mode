import { logger } from '@core/utils/logger';
import type { ExtensionConfig } from '@core/types';
import type { ProtocolMap } from '@core/protocol';
import { StorageRepository } from '@core/storage/StorageRepository';
import { StyleSimplificationService } from '@core/services';
import { sendMessage } from 'webext-bridge/content-script';
import { VideoMetadataExtractor } from './services/VideoMetadataExtractor';
import { BlockOverlayManager } from './components/BlockOverlayHost';
import { VideoTracker } from './services/VideoTracker';
import { PermissionChecker } from './services/PermissionChecker';
import { SearchPageHandler } from './services/SearchPageHandler';
import { StyleInjector } from './services/StyleInjector';
import { NavigationWatcher } from './NavigationWatcher';
import { PermissionOrchestrator } from './PermissionOrchestrator';
import { StyleOrchestrator } from './StyleOrchestrator';
import './purify.css';

if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
  // Extension context not available, skip initialization
} else {
  logger.debug('Content', 'Script loaded');

  async function safeSendMessage<T>(type: keyof ProtocolMap, data?: unknown): Promise<T | null> {
    try {
      return await sendMessage(type as never, data as never) as T;
    } catch (error) {
      if (error instanceof Error && error.message?.includes('back/forward cache')) {
        logger.debug('Content', 'Ignoring bfcache error for:', type);
        return null;
      }
      if (error instanceof Error && error.message?.includes('Extension context invalidated')) {
        logger.debug('Content', 'Extension context invalidated, reloading page...');
        window.location.reload();
        return null;
      }
      throw error;
    }
  }

  const metadataExtractor = new VideoMetadataExtractor();
  const blockOverlayManager = new BlockOverlayManager();
  const styleService = new StyleSimplificationService();
  const styleInjector = new StyleInjector();
  const permissionChecker = new PermissionChecker(safeSendMessage);
  const videoTracker = new VideoTracker(safeSendMessage, () => permissionChecker.getCurrentBvid());

  const permissionOrchestrator = new PermissionOrchestrator(
    metadataExtractor, blockOverlayManager, permissionChecker, videoTracker, safeSendMessage
  );
  const styleOrchestrator = new StyleOrchestrator(styleService, styleInjector, permissionChecker, metadataExtractor);

  function onNavigate() {
    styleOrchestrator.checkHomepageRedirect();
    styleOrchestrator.applyStyleSimplification();
    permissionOrchestrator.checkPermission();
  }

  const searchPageHandler = new SearchPageHandler();

  if (searchPageHandler.isSearchPage()) {
    StorageRepository.getKeys('config').then(({ config }) => {
      if (config?.searchSimplification?.enabled) {
        searchPageHandler.applyFilter(config.searchSimplification);
      }
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.config && searchPageHandler.isSearchPage()) {
      const newConfig = changes.config.newValue as ExtensionConfig;
      if (newConfig?.searchSimplification?.enabled) {
        searchPageHandler.applyFilter(newConfig.searchSimplification);
      } else {
        searchPageHandler.stopFilter();
      }
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.config || changes.permanentGroups || changes.instantList || changes.coolingList || changes.limboList || changes.ghostList || changes.allowedUploaders)) {
      if (permissionChecker.getCurrentBvid()) {
        permissionOrchestrator.checkPermission();
      }
    }
  });

  if (typeof window !== 'undefined' && window.location) {
    const navWatcher = new NavigationWatcher(onNavigate);
    navWatcher.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onNavigate);
  } else {
    onNavigate();
  }

  // Fallback: re-check every 5 minutes in case navigation was missed
  const FALLBACK_CHECK_MS = 5 * 60 * 1000;
  setInterval(() => {
    if (permissionChecker.getCurrentBvid()) {
      permissionOrchestrator.checkPermission();
    }
  }, FALLBACK_CHECK_MS);
}
