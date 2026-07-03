import { BILIBILI_SEARCH_URL } from '@core/constants';
import { StyleSimplificationService } from '@core/services';
import { PermissionChecker } from './services/PermissionChecker';
import { VideoMetadataExtractor } from './services/VideoMetadataExtractor';
import { StyleInjector } from './services/StyleInjector';
import { MigratedComponentOrchestrator } from './MigratedComponentOrchestrator';
import { logger } from '@core/utils/logger';

export class StyleOrchestrator {
  constructor(
    private styleService: StyleSimplificationService,
    private styleInjector: StyleInjector,
    private permissionChecker: PermissionChecker,
    private metadataExtractor: VideoMetadataExtractor,
    private migratedOrchestrator: MigratedComponentOrchestrator,
  ) {}

  async applyStyleSimplification(): Promise<void> {
    logger.debug('Content', 'Applying style simplification...');

    try {
      const config = await this.permissionChecker.getFullConfig();
      if (!config) {
        logger.debug('Content', 'No config found');
        return;
      }

      logger.debug('Content', 'Config loaded:', {
        homepageSimplification: config.homepageSimplification,
        dynamicSimplification: config.dynamicSimplification,
        videoPlayerSimplification: config.videoPlayerSimplification,
        liveSimplification: config.liveSimplification,
      });

      this.styleInjector.injectGlobal(this.styleService.generateGlobalStyles());

      if (this.styleService.isVideoPlayerPage() && config.videoPlayerSimplification?.enabled) {
        const vps = config.videoPlayerSimplification;
        this.styleInjector.injectPage(this.styleService.generateVideoPlayerStyles({
          hideComments: vps.hideComments,
          hideRecommendations: vps.hideRecommendations,
          hideDanmaku: vps.hideDanmaku,
          hideSidebar: vps.hideSidebar,
          hideAds: vps.hideAds,
          minimalPlayer: vps.minimalPlayer,
        }));
      }

      if (this.styleService.isHomepage() && config.homepageSimplification?.enabled) {
        this.styleInjector.injectPage(this.styleService.generateHomepageStyles(config.homepageSimplification));
      }

      if (this.styleService.isDynamicPage() && config.dynamicSimplification?.enabled) {
        this.styleInjector.injectPage(this.styleService.generateDynamicStyles(config.dynamicSimplification));
      }

      if (this.styleService.isLivePage() && config.liveSimplification?.enabled) {
        const ls = config.liveSimplification;
        this.styleInjector.injectPage(this.styleService.generateLiveStyles({
          hideComments: ls.hideComments,
          hideGiftEffects: ls.hideGiftEffects,
          hideAds: ls.hideAds,
          hideSidebar: ls.hideSidebar,
          minimalPlayer: ls.minimalPlayer,
        }));
      }

      if (this.styleService.isSearchPage() && config.searchSimplification?.enabled) {
        this.styleInjector.injectPage(this.styleService.generateSearchPageStyles());
      }

      // Apply migrated components
      this.migratedOrchestrator.applyAppearance(config.appearanceEnhancement);
      if (this.styleService.isLivePage()) {
        this.migratedOrchestrator.applyLiveEnhancement(config.liveEnhancement);
      }
      if (this.styleService.isVideoPlayerPage()) {
        this.migratedOrchestrator.applyVideoPlayerEnhancement(config.videoPlayerEnhancement);
      }
      this.migratedOrchestrator.applyThemeEnhancement(config.themeEnhancement);
    } catch (error) {
      logger.error('Content', 'Failed to apply style simplification:', error);
    }
  }

  async checkHomepageRedirect(): Promise<void> {
    try {
      const config = await this.permissionChecker.getFullConfig();
      if (!config?.homepageSimplification?.redirectToSearch) {
        return;
      }

      // 排除视频页、动态页、直播页、搜索页
      if (this.styleService.isVideoPlayerPage() || this.styleService.isDynamicPage() || this.metadataExtractor.isLivePage() || this.metadataExtractor.isSearchPage()) {
        logger.debug('Content', 'Not redirecting - on video/dynamic/live/search page');
        return;
      }

      // 检查是否使用自定义首页
      if (config.homepageSimplification.useCustomHomepage) {
        const customHomepageUrl = chrome.runtime.getURL('src/custom-homepage/index.html');
        logger.debug('Content', 'Redirecting to custom homepage');
        window.location.replace(customHomepageUrl);
      } else {
        logger.debug('Content', 'Redirecting to search page');
        window.location.replace(`${BILIBILI_SEARCH_URL}/`);
      }
    } catch (error) {
      console.error('[Content] Failed to check homepage redirect:', error);
    }
  }
}
