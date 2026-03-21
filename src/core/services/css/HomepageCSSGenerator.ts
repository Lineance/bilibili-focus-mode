import type { HomepageSimplificationOptions } from '../StyleSimplificationService';

export class HomepageCSSGenerator {
  generate(options: HomepageSimplificationOptions): string {
    const rules: string[] = [];

    if (options.hideRecommendations) {
      rules.push(`
        .recommended-container, .feed-card, .bili-feed4,
        .rcmd-box, .video-card-reco,
        [class*="recommend"], [class*="rcmd"] {
          display: none !important;
        }
      `);
    }

    if (options.hideTrending) {
      rules.push(`
        .rank-list, .trending-box, .popular-videos,
        .rank-container, .hot-list,
        [class*="trending"], [class*="popular"], [class*="hot"] {
          display: none !important;
        }
      `);
    }

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

    if (options.hideLiveStreams) {
      rules.push(`
        .live-card, .live-box, .living-box,
        [class*="live-"], [class*="living"] {
          display: none !important;
        }
      `);
    }

    if (options.compactLayout) {
      rules.push(`
        .header-channel, .channel-menu {
          padding: 4px 0 !important;
        }

        .bili-header {
          margin-bottom: 0 !important;
        }

        .bili-header__bar {
          height: 50px !important;
        }

        .feed-card {
          margin-bottom: 8px !important;
        }

        .header-banner, .banner-img {
          display: none !important;
        }
      `);
    }

    return rules.join('\n');
  }
}
