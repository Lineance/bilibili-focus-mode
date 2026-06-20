import { BILIBILI_SEARCH_URL } from '@core/constants';
import { StyleSimplificationService } from '@core/services';
import { PermissionChecker } from './services/PermissionChecker';
import { VideoMetadataExtractor } from './services/VideoMetadataExtractor';
import { StyleInjector } from './services/StyleInjector';
import { logger } from '@core/utils/logger';

export class StyleOrchestrator {
  constructor(
    private styleService: StyleSimplificationService,
    private styleInjector: StyleInjector,
    private permissionChecker: PermissionChecker,
    private metadataExtractor: VideoMetadataExtractor,
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
    } catch (error) {
      logger.error('Content', 'Failed to apply style simplification:', error);
    }
  }

  async checkHomepageRedirect(): Promise<void> {
    try {
      const config = await this.permissionChecker.getFullConfig();
      if (config?.homepageSimplification?.redirectToSearch) {
        if (this.styleService.isVideoPlayerPage() || this.styleService.isDynamicPage() || this.metadataExtractor.isLivePage() || this.metadataExtractor.isSearchPage()) {
          logger.debug('Content', 'Not redirecting - on video/dynamic/live/search page');
          return;
        }

        logger.debug('Content', 'Redirecting to search page');
        window.location.replace(`${BILIBILI_SEARCH_URL}/`);
      }
    } catch (error) {
      console.error('[Content] Failed to check homepage redirect:', error);
    }
  }
}
