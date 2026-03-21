import type { DynamicSimplificationOptions } from '../StyleSimplificationService';

export class DynamicCSSGenerator {
  generate(options: DynamicSimplificationOptions): string {
    const rules: string[] = [];

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

    if (options.hideRecommendations) {
      rules.push(`
        .rcmd-box, .recommend-box,
        [class*="recommend"], [class*="rcmd"],
        .bili-dyn-item[data-type="recommend"] {
          display: none !important;
        }
      `);
    }

    if (options.hideAds) {
      rules.push(`
        .ad-report, .ad-floor,
        [class*="ad-"], [class*="advertisement"],
        .bili-dyn-item[data-type="ad"] {
          display: none !important;
        }
      `);
    }

    if (options.showOnlyFollowing) {
      rules.push(`
        .bili-dyn-item:not([data-type="following"]):not([data-type="self"]) {
          display: none !important;
        }
      `);
    }

    if (options.compactLayout) {
      rules.push(`
        .bili-dyn-item {
          padding: 8px 0 !important;
          margin-bottom: 4px !important;
        }

        .bili-dyn-avatar {
          width: 40px !important;
          height: 40px !important;
        }

        .bili-dyn-header {
          margin-bottom: 4px !important;
        }

        .bili-dyn-banner, .dyn-banner {
          display: none !important;
        }
      `);
    }

    rules.push(`
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
}
