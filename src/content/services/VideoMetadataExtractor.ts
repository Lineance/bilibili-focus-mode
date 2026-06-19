import { BILIBILI_CDN_LIVE_COVER, TITLE_MAX_LENGTH } from '@core/constants';
import type { VideoMetadata } from '@core/types';
import { logger } from '@core/utils/logger';

export class VideoMetadataExtractor {
  /**
   * Extract video metadata from page
   */
  extractVideoMetadata(collectionDetectionEnabled: boolean): VideoMetadata | null {
    const bvidMatch = window.location.pathname.match(/\/video\/(BV\w+)/);
    if (!bvidMatch) return null;

    const bvid = bvidMatch[1];
    const titleEl = document.querySelector('h1.video-title, .video-title, h1.title');
    const uploaderEl = document.querySelector('.up-name, .username, .up-info__name, a.up-name');

    let titleText = titleEl?.textContent?.trim().slice(0, TITLE_MAX_LENGTH) || 'Unknown';

    if (collectionDetectionEnabled) {
      const collectionTitleEl = document.querySelector('.video-collection-title, .collection-title, .multi-page-title');
      if (collectionTitleEl?.textContent) {
        titleText = collectionTitleEl.textContent.trim().slice(0, TITLE_MAX_LENGTH);
      }
    }

    const coverUrl = this.extractCoverUrl();

    return {
      bvid,
      title: titleText,
      uploader: uploaderEl?.textContent?.trim() || 'Unknown',
      coverUrl,
      tag: 'ENTERTAINMENT',
      addedAt: Date.now(),
    };
  }

  /**
   * Extract live metadata from page with retry mechanism
   */
  async extractLiveMetadataWithRetry(maxRetries = 5, delay = 1000): Promise<VideoMetadata | null> {
    const roomIdMatch = window.location.pathname.match(/(?:\/live\/)?(\d+)/);
    if (!roomIdMatch) {
      logger.warn('Content', 'No room ID found in pathname');
      return null;
    }

    const roomId = roomIdMatch[1];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const titleEl = this.findLiveTitleElement();
      const uploaderEl = this.findLiveUploaderElement();

      if (titleEl?.textContent?.trim() && uploaderEl?.textContent?.trim()) {
        const titleText = titleEl.textContent.trim().slice(0, TITLE_MAX_LENGTH);
        const uploaderName = uploaderEl.textContent.trim();

        const coverUrl = this.extractLiveCoverUrl(roomId);

        return {
          bvid: `LIVE_${roomId}`,
          title: titleText,
          uploader: uploaderName,
          coverUrl,
          tag: 'ENTERTAINMENT',
          addedAt: Date.now(),
        };
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return null;
  }

  /**
   * Check if current page is a live streaming page
   */
  isLivePage(): boolean {
    if (typeof window === 'undefined' || !window.location) {
      return false;
    }
    return window.location.pathname.startsWith('/live/') ||
           window.location.host === 'live.bilibili.com' ||
           /^\/\d+$/.test(window.location.pathname);
  }

  /**
   * Check if current page is search page
   */
  isSearchPage(): boolean {
    if (typeof window === 'undefined' || !window.location) {
      return false;
    }
    return window.location.pathname.startsWith('/search') ||
           window.location.host === 'search.bilibili.com';
  }

  /**
   * Find live title element with multiple selectors
   */
  private findLiveTitleElement(): Element | null {
    const titleSelectors = [
      '#head-info-vm > div > div.lower-row > div.left-ctnr > div.live-title > div > div',
      '#head-info-vm .title-length-limit',
      '#head-info-vm .live-title',
      '[data-v-65e2b007]',
      '.live-title .text',
      '.title-length-limit',
      '.room-title',
      'h1.title',
      '[class*="title"]',
      'h1'
    ];
    
    for (const selector of titleSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.textContent?.trim()) {
          return el;
        }
      } catch (e) {
        logger.warn('Content', 'Error with selector:', selector, e);
      }
    }
    return null;
  }

  /**
   * Find live uploader element with multiple selectors
   */
  private findLiveUploaderElement(): Element | null {
    const uploaderSelectors = [
      '#head-info-vm > div > div.upper-row > div.left-ctnr.left-header-area > a',
      '#head-info-vm .room-owner-username',
      '[data-v-4dfcc850]',
      '.room-owner-username',
      '.anchor-name',
      '.up-name',
      '.username',
      'a[href*="space"]'
    ];
    
    for (const selector of uploaderSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.textContent?.trim()) {
          return el;
        }
      } catch (e) {
        logger.warn('Content', 'Error with selector:', selector, e);
      }
    }
    return null;
  }

  /**
   * Extract cover URL from page
   */
  private extractCoverUrl(): string {
    const coverSelectors = [
      'img[src*="hdslb.com"]',
      'img[src*="bilibili.com"]',
      '.video-cover img',
      '.bilibili-player-video-cover img',
      '.bpx-player-video-cover img',
      '.cover img',
      'meta[property="og:image"]',
    ];

    for (const selector of coverSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        if (selector.includes('meta')) {
          const coverUrl = (el as HTMLMetaElement).content || '';
          if (coverUrl) return coverUrl;
        } else {
          const coverUrl = (el as HTMLImageElement).src || '';
          if (coverUrl) return coverUrl;
        }
      }
    }

    return '';
  }

  /**
   * Extract live cover URL
   */
  private extractLiveCoverUrl(roomId: string): string {
    const coverSelectors = [
      '.room-cover img',
      '.live-cover img',
      '[class*="cover"] img',
      'meta[property="og:image"]',
    ];

    for (const selector of coverSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        if (selector.includes('meta')) {
          const coverUrl = (el as HTMLMetaElement).content || '';
          if (coverUrl) return coverUrl;
        } else {
          const coverUrl = (el as HTMLImageElement).src || '';
          if (coverUrl) return coverUrl;
        }
      }
    }

    return `${BILIBILI_CDN_LIVE_COVER}/${roomId}.jpg`;
  }
}
