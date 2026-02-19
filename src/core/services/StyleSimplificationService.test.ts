import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StyleSimplificationService } from './StyleSimplificationService';
import type { ExtensionConfig } from '@core/types';

describe('StyleSimplificationService', () => {
  let service: StyleSimplificationService;

  beforeEach(() => {
    service = new StyleSimplificationService();
    // Clean up any existing styles
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    service.removeStyles();
  });

  describe('isVideoPlayerPage', () => {
    it('should return true for video player pages', () => {
      // Mock window.location
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

  describe('applyVideoPlayerSimplification', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/video/BV1xx411c7mD' },
        writable: true,
      });
    });

    it('should inject styles when on video player page', () => {
      service.applyVideoPlayerSimplification({
        hideComments: true,
        hideRecommendations: true,
        hideDanmaku: true,
        hideSidebar: true,
        minimalPlayer: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.tagName).toBe('STYLE');
    });

    it('should not inject styles when not on video player page', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });

      service.applyVideoPlayerSimplification({
        hideComments: true,
        hideRecommendations: true,
        hideDanmaku: true,
        hideSidebar: true,
        minimalPlayer: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement).toBeFalsy();
    });

    it('should hide comments when hideComments is true', () => {
      service.applyVideoPlayerSimplification({
        hideComments: true,
        hideRecommendations: false,
        hideDanmaku: false,
        hideSidebar: false,
        minimalPlayer: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('#comment');
      expect(styleElement?.textContent).toContain('.comment-area');
    });

    it('should hide recommendations when hideRecommendations is true', () => {
      service.applyVideoPlayerSimplification({
        hideComments: false,
        hideRecommendations: true,
        hideDanmaku: false,
        hideSidebar: false,
        minimalPlayer: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('.recommend-list');
      expect(styleElement?.textContent).toContain('.next-play');
    });

    it('should hide danmaku when hideDanmaku is true', () => {
      service.applyVideoPlayerSimplification({
        hideComments: false,
        hideRecommendations: false,
        hideDanmaku: true,
        hideSidebar: false,
        minimalPlayer: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('#danmakuBox');
      expect(styleElement?.textContent).toContain('.danmaku-box');
    });

    it('should hide sidebar when hideSidebar is true', () => {
      service.applyVideoPlayerSimplification({
        hideComments: false,
        hideRecommendations: false,
        hideDanmaku: false,
        hideSidebar: true,
        minimalPlayer: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('.right-container');
      expect(styleElement?.textContent).toContain('.video-sections');
    });

    it('should apply minimal player styles when minimalPlayer is true', () => {
      service.applyVideoPlayerSimplification({
        hideComments: false,
        hideRecommendations: false,
        hideDanmaku: false,
        hideSidebar: false,
        minimalPlayer: true,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('.player-wrap');
      expect(styleElement?.textContent).toContain('max-width: 100%');
      // Should keep controls visible
      expect(styleElement?.textContent).toContain('.bilibili-player-control');
      expect(styleElement?.textContent).toContain('display: flex');
    });

    it('should remove existing styles before applying new ones', () => {
      // First application
      service.applyVideoPlayerSimplification({
        hideComments: true,
        hideRecommendations: false,
        hideDanmaku: false,
        hideSidebar: false,
        minimalPlayer: false,
      });

      const firstStyleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(firstStyleElement).toBeTruthy();

      // Second application with different options
      service.applyVideoPlayerSimplification({
        hideComments: false,
        hideRecommendations: true,
        hideDanmaku: false,
        hideSidebar: false,
        minimalPlayer: false,
      });

      const styleElements = document.querySelectorAll('#bilibili-focus-mode-styles');
      expect(styleElements.length).toBe(1);

      const secondStyleElement = styleElements[0];
      expect(secondStyleElement?.textContent).not.toContain('#comment');
      expect(secondStyleElement?.textContent).toContain('.recommend-list');
    });
  });

  describe('removeStyles', () => {
    it('should remove injected styles', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/video/BV1xx411c7mD' },
        writable: true,
      });

      service.applyVideoPlayerSimplification({
        hideComments: true,
        hideRecommendations: true,
        hideDanmaku: true,
        hideSidebar: true,
        minimalPlayer: false,
      });

      expect(document.getElementById('bilibili-focus-mode-styles')).toBeTruthy();

      service.removeStyles();

      expect(document.getElementById('bilibili-focus-mode-styles')).toBeFalsy();
    });

    it('should not throw when no styles are applied', () => {
      expect(() => service.removeStyles()).not.toThrow();
    });
  });

  describe('applyFromConfig', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/video/BV1xx411c7mD' },
        writable: true,
      });
    });

    it('should apply styles when enabled and on video player page', async () => {
      const config: ExtensionConfig = {
        videoPlayerSimplification: {
          enabled: true,
          hideComments: true,
          hideRecommendations: true,
          hideDanmaku: false,
          hideSidebar: false,
          minimalPlayer: false,
        },
      } as ExtensionConfig;

      await service.applyFromConfig(config);

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('#comment');
    });

    it('should not apply styles when disabled', async () => {
      const config: ExtensionConfig = {
        videoPlayerSimplification: {
          enabled: false,
          hideComments: true,
          hideRecommendations: true,
          hideDanmaku: true,
          hideSidebar: true,
          minimalPlayer: true,
        },
      } as ExtensionConfig;

      await service.applyFromConfig(config);

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement).toBeFalsy();
    });

    it('should remove styles when not on video player page', async () => {
      // First apply styles on video page
      const config: ExtensionConfig = {
        videoPlayerSimplification: {
          enabled: true,
          hideComments: true,
          hideRecommendations: true,
          hideDanmaku: true,
          hideSidebar: true,
          minimalPlayer: false,
        },
      } as ExtensionConfig;

      await service.applyFromConfig(config);
      expect(document.getElementById('bilibili-focus-mode-styles')).toBeTruthy();

      // Change to non-video page
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });

      // Re-apply (should remove)
      await service.applyFromConfig(config);
      expect(document.getElementById('bilibili-focus-mode-styles')).toBeFalsy();
    });

    it('should handle missing videoPlayerSimplification config', async () => {
      const config: ExtensionConfig = {} as ExtensionConfig;

      await expect(service.applyFromConfig(config)).resolves.not.toThrow();
      expect(document.getElementById('bilibili-focus-mode-styles')).toBeFalsy();
    });

    it('should apply homepage simplification when on homepage', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });

      const config: ExtensionConfig = {
        homepageSimplification: {
          enabled: true,
          hideRecommendations: true,
          hideTrending: false,
          hideAds: false,
          hideLiveStreams: false,
          compactLayout: false,
        },
      } as ExtensionConfig;

      await service.applyFromConfig(config);

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('.recommended-container');
    });

    it('should not apply homepage simplification when disabled', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });

      const config: ExtensionConfig = {
        homepageSimplification: {
          enabled: false,
          hideRecommendations: true,
          hideTrending: true,
          hideAds: true,
          hideLiveStreams: true,
          compactLayout: true,
        },
      } as ExtensionConfig;

      await service.applyFromConfig(config);

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement).toBeFalsy();
    });
  });

  describe('applyHomepageSimplification', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });
    });

    it('should inject styles when on homepage', () => {
      service.applyHomepageSimplification({
        hideRecommendations: true,
        hideTrending: true,
        hideAds: true,
        hideLiveStreams: true,
        compactLayout: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.tagName).toBe('STYLE');
    });

    it('should not inject styles when not on homepage', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/video/BV1xx' },
        writable: true,
      });

      service.applyHomepageSimplification({
        hideRecommendations: true,
        hideTrending: true,
        hideAds: true,
        hideLiveStreams: true,
        compactLayout: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement).toBeFalsy();
    });

    it('should hide recommendations when hideRecommendations is true', () => {
      service.applyHomepageSimplification({
        hideRecommendations: true,
        hideTrending: false,
        hideAds: false,
        hideLiveStreams: false,
        compactLayout: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('.recommended-container');
      expect(styleElement?.textContent).toContain('.feed-card');
    });

    it('should hide trending when hideTrending is true', () => {
      service.applyHomepageSimplification({
        hideRecommendations: false,
        hideTrending: true,
        hideAds: false,
        hideLiveStreams: false,
        compactLayout: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('.rank-list');
      expect(styleElement?.textContent).toContain('.popular-videos');
    });

    it('should hide ads when hideAds is true', () => {
      service.applyHomepageSimplification({
        hideRecommendations: false,
        hideTrending: false,
        hideAds: true,
        hideLiveStreams: false,
        compactLayout: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('.ad-report');
      expect(styleElement?.textContent).toContain('.banner-ad');
    });

    it('should hide live streams when hideLiveStreams is true', () => {
      service.applyHomepageSimplification({
        hideRecommendations: false,
        hideTrending: false,
        hideAds: false,
        hideLiveStreams: true,
        compactLayout: false,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('.live-card');
      expect(styleElement?.textContent).toContain('.live-box');
    });

    it('should apply compact layout when compactLayout is true', () => {
      service.applyHomepageSimplification({
        hideRecommendations: false,
        hideTrending: false,
        hideAds: false,
        hideLiveStreams: false,
        compactLayout: true,
      });

      const styleElement = document.getElementById('bilibili-focus-mode-styles');
      expect(styleElement?.textContent).toContain('.header-channel');
      expect(styleElement?.textContent).toContain('padding: 4px');
      expect(styleElement?.textContent).toContain('.header-banner');
    });
  });
});
