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

  isSearchPage(): boolean {
    return window.location.host === 'search.bilibili.com' ||
      window.location.pathname.startsWith('/search');
  }

  generateGlobalStyles(): string {
    return this.globalCSSGenerator.generate();
  }

  generateSearchPageStyles(): string {
    return this.globalCSSGenerator.generateSearchPageSimplification();
  }

  generateVideoPlayerStyles(options: VideoPlayerSimplificationOptions): string {
    return this.videoPlayerCSSGenerator.generate(options);
  }

  generateHomepageStyles(options: HomepageSimplificationOptions): string {
    return this.homepageCSSGenerator.generate(options);
  }

  generateDynamicStyles(options: DynamicSimplificationOptions): string {
    return this.dynamicCSSGenerator.generate(options);
  }

  generateLiveStyles(options: LiveSimplificationOptions): string {
    return this.liveCSSGenerator.generate(options);
  }
}
