import type { ExtensionConfig } from '@core/types';
import { VideoPlayerCSSGenerator } from './css/VideoPlayerCSSGenerator';
import { HomepageCSSGenerator } from './css/HomepageCSSGenerator';
import { DynamicCSSGenerator } from './css/DynamicCSSGenerator';
import { LiveCSSGenerator } from './css/LiveCSSGenerator';
import { GlobalCSSGenerator } from './css/GlobalCSSGenerator';

export interface VideoPlayerSimplificationOptions {
  hideComments: boolean;
  hideRecommendations: boolean;
  hideDanmaku: boolean;
  hideSidebar: boolean;
  hideAds: boolean;
  minimalPlayer: boolean;
}

export interface HomepageSimplificationOptions {
  hideRecommendations: boolean;
  hideTrending: boolean;
  hideAds: boolean;
  hideLiveStreams: boolean;
  compactLayout: boolean;
}

export interface DynamicSimplificationOptions {
  hideLiveStreams: boolean;
  hideRecommendations: boolean;
  hideAds: boolean;
  showOnlyFollowing: boolean;
  compactLayout: boolean;
}

export interface LiveSimplificationOptions {
  hideComments: boolean;
  hideGiftEffects: boolean;
  hideAds: boolean;
  hideSidebar: boolean;
  minimalPlayer: boolean;
}

export class StyleSimplificationService {
  private globalStyleElement: HTMLStyleElement | null = null;
  private pageStyleElement: HTMLStyleElement | null = null;
  private videoPlayerCSSGenerator = new VideoPlayerCSSGenerator();
  private homepageCSSGenerator = new HomepageCSSGenerator();
  private dynamicCSSGenerator = new DynamicCSSGenerator();
  private liveCSSGenerator = new LiveCSSGenerator();
  private globalCSSGenerator = new GlobalCSSGenerator();

  isVideoPlayerPage(): boolean {
    return window.location.pathname.startsWith('/video/');
  }

  isHomepage(): boolean {
    return window.location.pathname === '/' || window.location.pathname === '/index.html';
  }

  isDynamicPage(): boolean {
    return window.location.pathname === '/t.bilibili.com' ||
      window.location.host === 't.bilibili.com';
  }

  isLivePage(): boolean {
    return window.location.pathname.startsWith('/live/') ||
      window.location.host === 'live.bilibili.com' ||
      /^\/\d+$/.test(window.location.pathname);
  }

  applyVideoPlayerSimplification(options: VideoPlayerSimplificationOptions): void {
    if (!this.isVideoPlayerPage()) return;
    this.removePageStyles();
    const css = this.videoPlayerCSSGenerator.generate(options);
    this.injectPageStyles(css);
  }

  applyHomepageSimplification(options: HomepageSimplificationOptions): void {
    if (!this.isHomepage()) return;
    this.removePageStyles();
    const css = this.homepageCSSGenerator.generate(options);
    this.injectPageStyles(css);
  }

  applyDynamicSimplification(options: DynamicSimplificationOptions): void {
    if (!this.isDynamicPage()) return;
    this.removePageStyles();
    const css = this.dynamicCSSGenerator.generate(options);
    this.injectPageStyles(css);
  }

  applyLiveSimplification(options: LiveSimplificationOptions): void {
    if (!this.isLivePage()) return;
    this.removePageStyles();
    const css = this.liveCSSGenerator.generate(options);
    this.injectPageStyles(css);
  }

  removePageStyles(): void {
    if (this.pageStyleElement) {
      this.pageStyleElement.remove();
      this.pageStyleElement = null;
    }
  }

  removeGlobalStyles(): void {
    if (this.globalStyleElement) {
      this.globalStyleElement.remove();
      this.globalStyleElement = null;
    }
  }

  removeStyles(): void {
    this.removePageStyles();
    this.removeGlobalStyles();
  }

  applyGlobalStyles(): void {
    this.removeGlobalStyles();
    const css = this.globalCSSGenerator.generate();
    this.injectGlobalStyles(css);
  }

  private injectGlobalStyles(css: string): void {
    this.globalStyleElement = document.createElement('style');
    this.globalStyleElement.id = 'bilibili-focus-mode-global-styles';
    this.globalStyleElement.textContent = css;
    document.head.appendChild(this.globalStyleElement);
  }

  private injectPageStyles(css: string): void {
    this.pageStyleElement = document.createElement('style');
    this.pageStyleElement.id = 'bilibili-focus-mode-page-styles';
    this.pageStyleElement.textContent = css;
    document.head.appendChild(this.pageStyleElement);
  }

  async applyFromConfig(config: ExtensionConfig): Promise<void> {
    const { videoPlayerSimplification, homepageSimplification, dynamicSimplification } = config;

    const isVideoEnabled = videoPlayerSimplification?.enabled && this.isVideoPlayerPage();
    const isHomepageEnabled = homepageSimplification?.enabled && this.isHomepage();
    const isDynamicEnabled = dynamicSimplification?.enabled && this.isDynamicPage();

    if (!isVideoEnabled && !isHomepageEnabled && !isDynamicEnabled) {
      this.removeStyles();
      return;
    }

    this.applyGlobalStyles();

    if (isVideoEnabled) {
      this.applyVideoPlayerSimplification({
        hideComments: videoPlayerSimplification.hideComments,
        hideRecommendations: videoPlayerSimplification.hideRecommendations,
        hideDanmaku: videoPlayerSimplification.hideDanmaku,
        hideSidebar: videoPlayerSimplification.hideSidebar,
        hideAds: videoPlayerSimplification.hideAds,
        minimalPlayer: videoPlayerSimplification.minimalPlayer,
      });
      return;
    }

    if (isHomepageEnabled) {
      this.applyHomepageSimplification({
        hideRecommendations: homepageSimplification.hideRecommendations,
        hideTrending: homepageSimplification.hideTrending,
        hideAds: homepageSimplification.hideAds,
        hideLiveStreams: homepageSimplification.hideLiveStreams,
        compactLayout: homepageSimplification.compactLayout,
      });
      return;
    }

    if (isDynamicEnabled) {
      this.applyDynamicSimplification({
        hideLiveStreams: dynamicSimplification.hideLiveStreams,
        hideRecommendations: dynamicSimplification.hideRecommendations,
        hideAds: dynamicSimplification.hideAds,
        showOnlyFollowing: dynamicSimplification.showOnlyFollowing,
        compactLayout: dynamicSimplification.compactLayout,
      });
      return;
    }
  }
}
