import { describe, it, expect, beforeEach } from 'vitest';
import { StyleSimplificationService } from '@core/services/';

describe('StyleSimplificationService', () => {
  let service: StyleSimplificationService;

  beforeEach(() => {
    service = new StyleSimplificationService();
  });

  describe('isVideoPlayerPage', () => {
    it('should return true for video player pages', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/video/BV1xx411c7mD' },
        writable: true,
      });
      expect(service.isVideoPlayerPage()).toBe(true);
    });

    it('should return false for non-video pages', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });
      expect(service.isVideoPlayerPage()).toBe(false);

      Object.defineProperty(window, 'location', {
        value: { pathname: '/t.bilibili.com' },
        writable: true,
      });
      expect(service.isVideoPlayerPage()).toBe(false);
    });
  });

  describe('isHomepage', () => {
    it('should return true for homepage', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });
      expect(service.isHomepage()).toBe(true);

      Object.defineProperty(window, 'location', {
        value: { pathname: '/index.html' },
        writable: true,
      });
      expect(service.isHomepage()).toBe(true);
    });

    it('should return false for non-homepage', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/video/BV1xx' },
        writable: true,
      });
      expect(service.isHomepage()).toBe(false);

      Object.defineProperty(window, 'location', {
        value: { pathname: '/t.bilibili.com' },
        writable: true,
      });
      expect(service.isHomepage()).toBe(false);
    });
  });

  describe('isDynamicPage', () => {
    it('should return true for dynamic pages', () => {
      Object.defineProperty(window, 'location', {
        value: { host: 't.bilibili.com', pathname: '/' },
        writable: true,
      });
      expect(service.isDynamicPage()).toBe(true);
    });

    it('should return false for non-dynamic pages', () => {
      Object.defineProperty(window, 'location', {
        value: { host: 'www.bilibili.com', pathname: '/video/BV1xx' },
        writable: true,
      });
      expect(service.isDynamicPage()).toBe(false);

      Object.defineProperty(window, 'location', {
        value: { host: 'www.bilibili.com', pathname: '/' },
        writable: true,
      });
      expect(service.isDynamicPage()).toBe(false);
    });
  });

  describe('isLivePage', () => {
    it('should return true for live pages', () => {
      Object.defineProperty(window, 'location', {
        value: { host: 'live.bilibili.com', pathname: '/12345' },
        writable: true,
      });
      expect(service.isLivePage()).toBe(true);

      Object.defineProperty(window, 'location', {
        value: { host: 'www.bilibili.com', pathname: '/live/12345' },
        writable: true,
      });
      expect(service.isLivePage()).toBe(true);
    });

    it('should return false for non-live pages', () => {
      Object.defineProperty(window, 'location', {
        value: { host: 'www.bilibili.com', pathname: '/video/BV1xx' },
        writable: true,
      });
      expect(service.isLivePage()).toBe(false);
    });
  });

  describe('isSearchPage', () => {
    it('should return true for search pages', () => {
      Object.defineProperty(window, 'location', {
        value: { host: 'search.bilibili.com', pathname: '/' },
        writable: true,
      });
      expect(service.isSearchPage()).toBe(true);

      Object.defineProperty(window, 'location', {
        value: { host: 'www.bilibili.com', pathname: '/search' },
        writable: true,
      });
      expect(service.isSearchPage()).toBe(true);
    });

    it('should return false for non-search pages', () => {
      Object.defineProperty(window, 'location', {
        value: { host: 'www.bilibili.com', pathname: '/video/BV1xx' },
        writable: true,
      });
      expect(service.isSearchPage()).toBe(false);
    });
  });

  describe('generateGlobalStyles', () => {
    it('should return a CSS string', () => {
      const css = service.generateGlobalStyles();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('should contain header hiding rules', () => {
      const css = service.generateGlobalStyles();
      expect(css).toContain('#bili-header-container');
    });
  });

  describe('generateVideoPlayerStyles', () => {
    it('should hide comments when hideComments is true', () => {
      const css = service.generateVideoPlayerStyles({
        hideComments: true,
        hideRecommendations: false,
        hideDanmaku: false,
        hideSidebar: false,
        hideAds: false,
        minimalPlayer: false,
      });

      expect(css).toContain('#comment');
      expect(css).toContain('.comment-area');
    });

    it('should hide recommendations when hideRecommendations is true', () => {
      const css = service.generateVideoPlayerStyles({
        hideComments: false,
        hideRecommendations: true,
        hideDanmaku: false,
        hideSidebar: false,
        hideAds: false,
        minimalPlayer: false,
      });

      expect(css).toContain('.recommend-list');
      expect(css).toContain('.next-play');
    });

    it('should hide danmaku when hideDanmaku is true', () => {
      const css = service.generateVideoPlayerStyles({
        hideComments: false,
        hideRecommendations: false,
        hideDanmaku: true,
        hideSidebar: false,
        hideAds: false,
        minimalPlayer: false,
      });

      expect(css).toContain('#danmakuBox');
      expect(css).toContain('.danmaku-box');
    });

    it('should hide sidebar when hideSidebar is true', () => {
      const css = service.generateVideoPlayerStyles({
        hideComments: false,
        hideRecommendations: false,
        hideDanmaku: false,
        hideSidebar: true,
        hideAds: false,
        minimalPlayer: false,
      });

      expect(css).toContain('.right-container');
      expect(css).toContain('.video-sections');
    });

    it('should hide ads when hideAds is true', () => {
      const css = service.generateVideoPlayerStyles({
        hideComments: false,
        hideRecommendations: false,
        hideDanmaku: false,
        hideSidebar: false,
        hideAds: true,
        minimalPlayer: false,
      });

      expect(css).toContain('.ad-report');
      expect(css).toContain('.strip-ad');
    });

    it('should apply minimal player styles when minimalPlayer is true', () => {
      const css = service.generateVideoPlayerStyles({
        hideComments: false,
        hideRecommendations: false,
        hideDanmaku: false,
        hideSidebar: false,
        hideAds: false,
        minimalPlayer: true,
      });

      expect(css).toContain('.player-wrap');
      expect(css).toContain('max-width: 100%');
      expect(css).toContain('.bilibili-player-control');
      expect(css).toContain('display: flex');
    });
  });

  describe('generateHomepageStyles', () => {
    it('should hide recommendations when hideRecommendations is true', () => {
      const css = service.generateHomepageStyles({
        hideRecommendations: true,
        hideTrending: false,
        hideAds: false,
        hideLiveStreams: false,
        compactLayout: false,
      });

      expect(css).toContain('.recommended-container');
      expect(css).toContain('.feed-card');
    });

    it('should hide trending when hideTrending is true', () => {
      const css = service.generateHomepageStyles({
        hideRecommendations: false,
        hideTrending: true,
        hideAds: false,
        hideLiveStreams: false,
        compactLayout: false,
      });

      expect(css).toContain('.rank-list');
      expect(css).toContain('.popular-videos');
    });

    it('should hide ads when hideAds is true', () => {
      const css = service.generateHomepageStyles({
        hideRecommendations: false,
        hideTrending: false,
        hideAds: true,
        hideLiveStreams: false,
        compactLayout: false,
      });

      expect(css).toContain('.ad-report');
      expect(css).toContain('.banner-ad');
    });

    it('should hide live streams when hideLiveStreams is true', () => {
      const css = service.generateHomepageStyles({
        hideRecommendations: false,
        hideTrending: false,
        hideAds: false,
        hideLiveStreams: true,
        compactLayout: false,
      });

      expect(css).toContain('.live-card');
      expect(css).toContain('.live-box');
    });

    it('should apply compact layout when compactLayout is true', () => {
      const css = service.generateHomepageStyles({
        hideRecommendations: false,
        hideTrending: false,
        hideAds: false,
        hideLiveStreams: false,
        compactLayout: true,
      });

      expect(css).toContain('.header-channel');
      expect(css).toContain('padding: 4px');
      expect(css).toContain('.header-banner');
    });
  });

  describe('generateDynamicStyles', () => {
    it('should hide recommendations when hideRecommendations is true', () => {
      const css = service.generateDynamicStyles({
        hideRecommendations: true,
        hideLiveStreams: false,
        hideAds: false,
        showOnlyFollowing: false,
        compactLayout: false,
      });

      expect(css).toContain('.rcmd-box');
      expect(css).toContain('.bili-dyn-item[data-type="recommend"]');
    });

    it('should hide live streams when hideLiveStreams is true', () => {
      const css = service.generateDynamicStyles({
        hideRecommendations: false,
        hideLiveStreams: true,
        hideAds: false,
        showOnlyFollowing: false,
        compactLayout: false,
      });

      expect(css).toContain('.bili-dyn-item[data-type="live"]');
      expect(css).toContain('.live-card');
    });

    it('should hide ads when hideAds is true', () => {
      const css = service.generateDynamicStyles({
        hideRecommendations: false,
        hideLiveStreams: false,
        hideAds: true,
        showOnlyFollowing: false,
        compactLayout: false,
      });

      expect(css).toContain('.bili-dyn-item[data-type="ad"]');
      expect(css).toContain('.ad-report');
    });

    it('should show only following when showOnlyFollowing is true', () => {
      const css = service.generateDynamicStyles({
        hideRecommendations: false,
        hideLiveStreams: false,
        hideAds: false,
        showOnlyFollowing: true,
        compactLayout: false,
      });

      expect(css).toContain('.bili-dyn-item:not([data-type="following"])');
    });

    it('should apply compact layout when compactLayout is true', () => {
      const css = service.generateDynamicStyles({
        hideRecommendations: false,
        hideLiveStreams: false,
        hideAds: false,
        showOnlyFollowing: false,
        compactLayout: true,
      });

      expect(css).toContain('.bili-dyn-item');
      expect(css).toContain('padding: 8px 0');
    });
  });

  describe('generateLiveStyles', () => {
    it('should hide comments when hideComments is true', () => {
      const css = service.generateLiveStyles({
        hideComments: true,
        hideGiftEffects: false,
        hideAds: false,
        hideSidebar: false,
        minimalPlayer: false,
      });

      expect(css).toContain('#chat-control-panel-vm');
      expect(css).toContain('#chat-history-panel');
    });

    it('should hide gift effects when hideGiftEffects is true', () => {
      const css = service.generateLiveStyles({
        hideComments: false,
        hideGiftEffects: true,
        hideAds: false,
        hideSidebar: false,
        minimalPlayer: false,
      });

      expect(css).toContain('#gift-control-vm');
      expect(css).toContain('.gift-box');
    });

    it('should hide ads when hideAds is true', () => {
      const css = service.generateLiveStyles({
        hideComments: false,
        hideGiftEffects: false,
        hideAds: true,
        hideSidebar: false,
        minimalPlayer: false,
      });

      expect(css).toContain('.ad-report');
    });

    it('should hide sidebar when hideSidebar is true', () => {
      const css = service.generateLiveStyles({
        hideComments: false,
        hideGiftEffects: false,
        hideAds: false,
        hideSidebar: true,
        minimalPlayer: false,
      });

      expect(css).toContain('#aside-area-vm');
      expect(css).toContain('.aside-area');
    });

    it('should apply minimal player styles when minimalPlayer is true', () => {
      const css = service.generateLiveStyles({
        hideComments: false,
        hideGiftEffects: false,
        hideAds: false,
        hideSidebar: false,
        minimalPlayer: true,
      });

      expect(css).toContain('#head-info-vm');
      expect(css).toContain('#live-player');
      expect(css).toContain('width: 100%');
      expect(css).toContain('height: 100vh');
    });
  });

  describe('generateSearchPageStyles', () => {
    it('should return CSS for hiding search page content', () => {
      const css = service.generateSearchPageStyles();
      expect(css).toContain('.search-entry-page');
      expect(css).toContain('.search-panel-popover');
    });
  });
});
