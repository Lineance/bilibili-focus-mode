import type { ExtensionConfig } from '@core/types';

export interface StyleSimplificationOptions {
  hideComments: boolean;
  hideRecommendations: boolean;
  hideDanmaku: boolean;
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
   * Apply style simplification to video player page
   */
  applyVideoPlayerSimplification(options: StyleSimplificationOptions): void {
    if (!this.isVideoPlayerPage()) return;

    // Remove existing styles
    this.removeStyles();

    // Generate CSS rules
    const css = this.generateVideoPlayerCSS(options);

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
  private generateVideoPlayerCSS(options: StyleSimplificationOptions): string {
    const rules: string[] = [];

    // Hide comments
    if (options.hideComments) {
      rules.push(`
        #comment, .comment-area, .reply-wrapper,
        .comment-list, .comment-header, .comment-send {
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
    const { videoPlayerSimplification } = config;

    if (videoPlayerSimplification?.enabled && this.isVideoPlayerPage()) {
      this.applyVideoPlayerSimplification({
        hideComments: videoPlayerSimplification.hideComments,
        hideRecommendations: videoPlayerSimplification.hideRecommendations,
        hideDanmaku: videoPlayerSimplification.hideDanmaku,
        hideSidebar: videoPlayerSimplification.hideSidebar,
        minimalPlayer: videoPlayerSimplification.minimalPlayer,
      });
    } else {
      this.removeStyles();
    }
  }
}
