import type { ExtensionConfig } from '@core/types';

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
  private styleElement: HTMLStyleElement | null = null;

  /**
   * Check if current page is a video player page
   */
  isVideoPlayerPage(): boolean {
    return window.location.pathname.startsWith('/video/');
  }

  /**
   * Check if current page is the homepage
   */
  isHomepage(): boolean {
    return window.location.pathname === '/' || window.location.pathname === '/index.html';
  }

  /**
   * Check if current page is the dynamic page
   */
  isDynamicPage(): boolean {
    return window.location.pathname === '/t.bilibili.com' ||
      window.location.host === 't.bilibili.com';
  }

  /**
   * Check if current page is a live streaming page
   */
  isLivePage(): boolean {
    return window.location.pathname.startsWith('/live/') ||
      window.location.host === 'live.bilibili.com' ||
      /^\/\d+$/.test(window.location.pathname);
  }

  /**
   * Apply style simplification to video player page
   */
  applyVideoPlayerSimplification(options: VideoPlayerSimplificationOptions): void {
    if (!this.isVideoPlayerPage()) return;

    // Remove existing styles
    this.removeStyles();

    // Generate CSS rules
    const css = this.generateVideoPlayerCSS(options);

    // Inject styles
    this.injectStyles(css);
  }

  /**
   * Apply style simplification to homepage
   */
  applyHomepageSimplification(options: HomepageSimplificationOptions): void {
    if (!this.isHomepage()) return;

    // Remove existing styles
    this.removeStyles();

    // Generate CSS rules
    const css = this.generateHomepageCSS(options);

    // Inject styles
    this.injectStyles(css);
  }

  /**
   * Apply style simplification to dynamic page
   */
  applyDynamicSimplification(options: DynamicSimplificationOptions): void {
    if (!this.isDynamicPage()) return;

    // Remove existing styles
    this.removeStyles();

    // Generate CSS rules
    const css = this.generateDynamicCSS(options);

    // Inject styles
    this.injectStyles(css);
  }

  /**
   * Apply style simplification to live streaming page
   */
  applyLiveSimplification(options: LiveSimplificationOptions): void {
    if (!this.isLivePage()) return;

    // Remove existing styles
    this.removeStyles();

    // Generate CSS rules
    const css = this.generateLiveCSS(options);

    // Inject styles
    this.injectStyles(css);
  }

  /**
   * Remove applied styles
   */
  removeStyles(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  /**
   * Generate CSS for video player simplification
   */
  private generateVideoPlayerCSS(options: VideoPlayerSimplificationOptions): string {
    const rules: string[] = [];

    // Hide comments
    if (options.hideComments) {
      rules.push(`
        #comment, #commentapp, .comment-area, .reply-wrapper,
        .comment-list, .comment-header, .comment-send,
        bili-comments, [class*="comment"], [id*="comment"] {
          display: none !important;
        }
      `);
    }

    // Hide recommendations
    if (options.hideRecommendations) {
      rules.push(`
        .recommend-list, .next-play, .related-video,
        .rec-list, .video-page-card-small,
        [class*="recommend"], [class*="related"] {
          display: none !important;
        }
      `);
    }

    // Hide danmaku
    if (options.hideDanmaku) {
      rules.push(`
        #danmakuBox, .danmaku-box, .bilibili-player-danmaku,
        .bpx-player-danmaku, .player-danmaku {
          display: none !important;
        }
      `);
    }

    // Hide sidebar
    if (options.hideSidebar) {
      rules.push(`
        .right-container, .video-sections,
        .up-info-holder, .tag-panel,
        .video-desc, .video-toolbar {
          display: none !important;
        }
      `);
    }

    // Hide ads
    if (options.hideAds) {
      rules.push(`
        .ad-report, .ad-floor, .banner-ad,
        .strip-ad, .strip-ad-inner, .left-banner,
        .right-bottom-banner, .ad-floor-exp,
        [class*="ad-"], [class*="advertisement"],
        [class*="strip-ad"], [id*="ad"] {
          display: none !important;
        }
      `);
    }

    // Minimal player mode - keep controls, hide distractions
    if (options.minimalPlayer) {
      rules.push(`
        /* Center the player */
        .player-wrap, .video-player-wrap {
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 auto !important;
        }

        /* Hide non-essential elements but keep controls */
        .video-info, .user-info, .video-tags,
        .action-bar, .share-bar, .coin-bar,
        .fav-bar, .like-bar, .dislike-bar {
          display: none !important;
        }

        /* Keep player controls visible */
        .bilibili-player-control, .bpx-player-control,
        .player-control-bottom, .bilibili-player-video-control {
          display: flex !important;
        }

        /* Simplify layout */
        .video-container {
          padding: 0 !important;
          max-width: none !important;
        }

        /* Hide header distractions */
        .header-channel, .channel-menu, .nav-channel {
          display: none !important;
        }
      `);
    }

    return rules.join('\n');
  }

  /**
   * Generate CSS for homepage simplification
   */
  private generateHomepageCSS(options: HomepageSimplificationOptions): string {
    const rules: string[] = [];

    // Hide recommendations
    if (options.hideRecommendations) {
      rules.push(`
        .recommended-container, .feed-card, .bili-feed4,
        .rcmd-box, .video-card-reco,
        [class*="recommend"], [class*="rcmd"] {
          display: none !important;
        }
      `);
    }

    // Hide trending
    if (options.hideTrending) {
      rules.push(`
        .rank-list, .trending-box, .popular-videos,
        .rank-container, .hot-list,
        [class*="trending"], [class*="popular"], [class*="hot"] {
          display: none !important;
        }
      `);
    }

    // Hide ads
    if (options.hideAds) {
      rules.push(`
        .ad-report, .ad-floor, .banner-ad,
        .strip-ad, .strip-ad-inner, .left-banner,
        [class*="ad-"], [class*="advertisement"],
        [class*="strip-ad"], [id*="ad"],
        .activity-ad, .game-ad {
          display: none !important;
        }
      `);
    }

    // Hide live streams
    if (options.hideLiveStreams) {
      rules.push(`
        .live-card, .live-box, .living-box,
        [class*="live-"], [class*="living"] {
          display: none !important;
        }
      `);
    }

    // Compact layout
    if (options.compactLayout) {
      rules.push(`
        /* Reduce padding and margins */
        .header-channel, .channel-menu {
          padding: 4px 0 !important;
        }

        .bili-header {
          margin-bottom: 0 !important;
        }

        /* Smaller header */
        .bili-header__bar {
          height: 50px !important;
        }

        /* Compact feed items */
        .feed-card {
          margin-bottom: 8px !important;
        }

        /* Hide decorative elements */
        .header-banner, .banner-img {
          display: none !important;
        }
      `);
    }

    return rules.join('\n');
  }

  /**
   * Generate CSS for dynamic page simplification
   */
  private generateDynamicCSS(options: DynamicSimplificationOptions): string {
    const rules: string[] = [];

    // Hide live streams
    if (options.hideLiveStreams) {
      rules.push(`
        .live-card, .live-box, .living-box,
        [class*="live-"], [class*="living"],
        .bili-dyn-item[data-type="live"],
        .dyn-live {
          display: none !important;
        }
      `);
    }

    // Hide recommendations
    if (options.hideRecommendations) {
      rules.push(`
        .rcmd-box, .recommend-box,
        [class*="recommend"], [class*="rcmd"],
        .bili-dyn-item[data-type="recommend"] {
          display: none !important;
        }
      `);
    }

    // Hide ads
    if (options.hideAds) {
      rules.push(`
        .ad-report, .ad-floor,
        [class*="ad-"], [class*="advertisement"],
        .bili-dyn-item[data-type="ad"] {
          display: none !important;
        }
      `);
    }

    // Show only following
    if (options.showOnlyFollowing) {
      rules.push(`
        /* Hide non-following content */
        .bili-dyn-item:not([data-type="following"]):not([data-type="self"]) {
          display: none !important;
        }
      `);
    }

    // Compact layout
    if (options.compactLayout) {
      rules.push(`
        /* Reduce padding */
        .bili-dyn-item {
          padding: 8px 0 !important;
          margin-bottom: 4px !important;
        }

        /* Smaller avatars */
        .bili-dyn-avatar {
          width: 40px !important;
          height: 40px !important;
        }

        /* Compact header */
        .bili-dyn-header {
          margin-bottom: 4px !important;
        }

        /* Hide decorative elements */
        .bili-dyn-banner, .dyn-banner {
          display: none !important;
        }
      `);
    }

    // Always hide right sidebar on dynamic page
    rules.push(`
      /* Hide right sidebar */
      #app > div.bili-dyn-home--member > aside.right,
      #app > div.bili-dyn-home--member > aside.right > section.sticky,
      #app > div.bili-dyn-home--member > aside.right > section.sticky > div,
      .bili-dyn-home--member aside.right,
      aside.right section.sticky {
        display: none !important;
      }
    `);

    return rules.join('\n');
  }

  /**
   * Generate CSS for live streaming simplification
   */
  private generateLiveCSS(options: LiveSimplificationOptions): string {
    const rules: string[] = [];

    // Hide comments
    if (options.hideComments) {
      rules.push(`
        #chat-control-panel-vm,
        #chat-history-panel,
        .chat-history-panel,
        .chat-control-panel,
        #rank-list-vm,
        .rank-list,
        [class*="chat"],
        [class*="comment"] {
          display: none !important;
        }
      `);
    }

    // Hide gift effects
    if (options.hideGiftEffects) {
      rules.push(`
        #gift-control-vm,
        .gift-control,
        #my-dear-haruna-vm,
        .gift-box,
        [class*="gift"],
        [class*="present"],
        .gift-icon,
        .gift-effect {
          display: none !important;
        }
      `);
    }

    // Hide ads
    if (options.hideAds) {
      rules.push(`
        .ad-report,
        .ad-floor,
        [class*="ad-"],
        [class*="advertisement"] {
          display: none !important;
        }
      `);
    }

    // Hide sidebar
    if (options.hideSidebar) {
      rules.push(`
        #aside-area-vm,
        .aside-area,
        #sidebar-vm,
        .sidebar {
          display: none !important;
        }
      `);
    }

    // Minimal player mode
    if (options.minimalPlayer) {
      rules.push(`
        /* Hide non-essential elements */
        #head-info-vm,
        .head-info,
        #gift-control-vm,
        #chat-control-panel-vm {
          display: none !important;
        }

        /* Center the player */
        #live-player,
        .live-player {
          width: 100% !important;
          height: 100vh !important;
        }
      `);
    }

    // Always hide specific live page elements
    rules.push(`
      /* Hide navigation bar */
      #room-ssr-vm > div.link-navbar-ctnr.z-link-navbar.w-100.p-fixed.p-zero.ts-dot-4.z-navbar.contain-optimize,
      .link-navbar-ctnr,
      .z-link-navbar {
        display: none !important;
      }

      /* Hide right section of header */
      #head-info-vm > div > div.upper-row > div.right-ctnr,
      .right-ctnr {
        display: none !important;
      }

      /* Hide left header area extra elements */
      #head-info-vm > div > div.upper-row > div.left-ctnr.left-header-area > div > div {
        display: none !important;
      }

      /* Hide gift control */
      #gift-control-vm,
      .gift-control-vm {
        display: none !important;
      }

      /* Hide sections */
      #sections-vm,
      .sections-vm {
        display: none !important;
      }

      /* Hide rank list content */
      #rank-list-ctnr-box > div.tab-content.ts-dot-2,
      .tab-content.ts-dot-2 {
        display: none !important;
      }
    `);

    return rules.join('\n');
  }

  /**
   * Apply global styles that work on all pages
   */
  applyGlobalStyles(): void {
    // Remove existing styles first
    this.removeStyles();

    const css = `
      /* Hide entire header on search page */
      #bili-header-container > div {
        display: none !important;
      }

      /* Hide search entry banner on search page */
      #i_cecream > div > div.search-entry-page.p_relative > div > div > div > div > div    `;

    this.injectStyles(css);
  }

  /**
   * Inject CSS into page
   */
  private injectStyles(css: string): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'bilibili-focus-mode-styles';
    this.styleElement.textContent = css;
    document.head.appendChild(this.styleElement);
  }

  /**
   * Load config and apply appropriate styles
   */
  async applyFromConfig(config: ExtensionConfig): Promise<void> {
    const { videoPlayerSimplification, homepageSimplification, dynamicSimplification } = config;

    // Always apply global styles first
    this.applyGlobalStyles();

    // Apply video player simplification
    if (videoPlayerSimplification?.enabled && this.isVideoPlayerPage()) {
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

    // Apply homepage simplification
    if (homepageSimplification?.enabled && this.isHomepage()) {
      this.applyHomepageSimplification({
        hideRecommendations: homepageSimplification.hideRecommendations,
        hideTrending: homepageSimplification.hideTrending,
        hideAds: homepageSimplification.hideAds,
        hideLiveStreams: homepageSimplification.hideLiveStreams,
        compactLayout: homepageSimplification.compactLayout,
      });
      return;
    }

    // Apply dynamic page simplification
    if (dynamicSimplification?.enabled && this.isDynamicPage()) {
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
