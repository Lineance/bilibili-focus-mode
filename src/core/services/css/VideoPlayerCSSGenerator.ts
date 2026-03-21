import type { VideoPlayerSimplificationOptions } from '../StyleSimplificationService';

export class VideoPlayerCSSGenerator {
  generate(options: VideoPlayerSimplificationOptions): string {
    const rules: string[] = [];

    if (options.hideComments) {
      rules.push(`
        #comment, #commentapp, .comment-area, .reply-wrapper,
        .comment-list, .comment-header, .comment-send,
        bili-comments, [class*="comment"], [id*="comment"] {
          display: none !important;
        }
      `);
    }

    if (options.hideRecommendations) {
      rules.push(`
        .recommend-list, .next-play, .related-video,
        .rec-list, .video-page-card-small,
        [class*="recommend"], [class*="related"] {
          display: none !important;
        }
      `);
    }

    if (options.hideDanmaku) {
      rules.push(`
        #danmakuBox, .danmaku-box, .bilibili-player-danmaku,
        .bpx-player-danmaku, .player-danmaku {
          display: none !important;
        }
      `);
    }

    if (options.hideSidebar) {
      rules.push(`
        .right-container, .video-sections,
        .up-info-holder, .tag-panel,
        .video-desc, .video-toolbar {
          display: none !important;
        }
      `);
    }

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

    if (options.minimalPlayer) {
      rules.push(`
        .player-wrap, .video-player-wrap {
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 auto !important;
        }

        .video-info, .user-info, .video-tags,
        .action-bar, .share-bar, .coin-bar,
        .fav-bar, .like-bar, .dislike-bar {
          display: none !important;
        }

        .bilibili-player-control, .bpx-player-control,
        .player-control-bottom, .bilibili-player-video-control {
          display: flex !important;
        }

        .video-container {
          padding: 0 !important;
          max-width: none !important;
        }

        .header-channel, .channel-menu, .nav-channel {
          display: none !important;
        }
      `);
    }

    return rules.join('\n');
  }
}
