import type { LiveSimplificationOptions } from '../StyleSimplificationService';

export class LiveCSSGenerator {
  generate(options: LiveSimplificationOptions): string {
    const rules: string[] = [];

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

    if (options.minimalPlayer) {
      rules.push(`
        #head-info-vm,
        .head-info,
        #gift-control-vm {
          display: none !important;
        }

        #chat-control-panel-vm {
          display: block !important;
        }

        #live-player,
        .live-player {
          width: 100% !important;
          height: 100vh !important;
        }
      `);
    }

    rules.push(`
      #room-ssr-vm > div.link-navbar-ctnr.z-link-navbar.w-100.p-fixed.p-zero.ts-dot-4.z-navbar.contain-optimize,
      .link-navbar-ctnr,
      .z-link-navbar {
        display: none !important;
      }

      #head-info-vm > div > div.upper-row > div.right-ctnr,
      .right-ctnr {
        display: none !important;
      }

      #head-info-vm > div > div.upper-row > div.left-ctnr.left-header-area > div > div {
        display: none !important;
      }

      #gift-control-vm,
      .gift-control-vm {
        display: none !important;
      }

      #sections-vm,
      .sections-vm {
        display: none !important;
      }

      #rank-list-ctnr-box > div.tab-content.ts-dot-2,
      .tab-content.ts-dot-2 {
        display: none !important;
      }

      body > div.live-room-app.p-relative > main > footer,
      .live-room-app footer,
      main > footer {
        display: none !important;
      }
    `);

    return rules.join('\n');
  }
}
