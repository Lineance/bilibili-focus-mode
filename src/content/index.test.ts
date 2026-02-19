import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PermissionResult } from '@core/types';

// Mock chrome APIs
const mockSendMessage = vi.fn();
const mockGetURL = vi.fn((path: string) => `chrome-extension://test-id/${path}`);
const mockOpenOptionsPage = vi.fn();

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    getURL: mockGetURL,
    openOptionsPage: mockOpenOptionsPage,
  },
});

// Mock webext-bridge
vi.mock('webext-bridge/content-script', () => ({
  sendMessage: mockSendMessage,
}));

describe('Content Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/video/BV1xx411c7mD',
        href: 'https://www.bilibili.com/video/BV1xx411c7mD',
      },
      writable: true,
    });
    
    // Mock window.alert
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Video Metadata Extraction', () => {
    it('should extract metadata from video page', async () => {
      // Setup DOM
      document.body.innerHTML = `
        <h1 class="video-title">Test Video Title</h1>
        <div class="up-name">Test Uploader</div>
        <div class="video-cover">
          <img src="https://example.com/cover.jpg" />
        </div>
      `;

      // Mock successful permission check
      mockSendMessage.mockResolvedValueOnce({ allowed: true, reason: 'PERMANENT' } as PermissionResult);

      // Import content script
      await import('./index');

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify sendMessage was called with correct data
      expect(mockSendMessage).toHaveBeenCalledWith(
        'check-permission',
        expect.objectContaining({
          bvid: 'BV1xx411c7mD',
        })
      );
    });

    it('should not extract metadata on non-video pages', async () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/', href: 'https://www.bilibili.com/' },
        writable: true,
      });

      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not send message on non-video pages
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Block Overlay', () => {
    it('should show block overlay when permission denied', async () => {
      document.body.innerHTML = `
        <h1 class="video-title">Test Video</h1>
        <div class="up-name">Uploader</div>
      `;

      // Mock permission denied
      mockSendMessage.mockResolvedValueOnce({ 
        allowed: false, 
        reason: 'NO_PERMISSION' 
      } as PermissionResult);

      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check overlay was created
      const overlay = document.querySelector('.bilibili-focus-mode-block-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay?.textContent).toContain('视频未审批');
      expect(overlay?.textContent).toContain('加入待审池');
    });

    it('should not show overlay when permission granted', async () => {
      document.body.innerHTML = `
        <h1 class="video-title">Test Video</h1>
        <div class="up-name">Uploader</div>
      `;

      // Mock permission granted
      mockSendMessage.mockResolvedValueOnce({ 
        allowed: true, 
        reason: 'PERMANENT' 
      } as PermissionResult);

      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check overlay was not created
      const overlay = document.querySelector('.bilibili-focus-mode-block-overlay');
      expect(overlay).toBeFalsy();
    });
  });

  describe('Add to Limbo', () => {
    it('should show add to limbo button in overlay', async () => {
      document.body.innerHTML = `
        <h1 class="video-title">Test Video</h1>
        <div class="up-name">Uploader</div>
      `;

      // Mock permission denied to show overlay
      mockSendMessage.mockResolvedValueOnce({ 
        allowed: false, 
        reason: 'NO_PERMISSION',
        inReviewWindow: true,
        timeUntilWindow: 0
      } as PermissionResult);

      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check that add to limbo button exists
      const addButton = document.querySelector('#bfm-add-limbo') as HTMLButtonElement;
      expect(addButton).toBeTruthy();
      expect(addButton?.textContent).toContain('加入待审池');
    });
  });

  describe('Open Manager', () => {
    it('should show open manager button in overlay', async () => {
      document.body.innerHTML = `
        <h1 class="video-title">Test Video</h1>
        <div class="up-name">Uploader</div>
      `;

      // Mock permission denied to show overlay
      mockSendMessage.mockResolvedValueOnce({ 
        allowed: false, 
        reason: 'NO_PERMISSION',
        inReviewWindow: true,
        timeUntilWindow: 0
      } as PermissionResult);

      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check that open manager button exists
      const managerButton = document.querySelector('#bfm-open-manager') as HTMLButtonElement;
      expect(managerButton).toBeTruthy();
      expect(managerButton?.textContent).toContain('打开管理页');
    });
  });

  describe('Homepage Redirect', () => {
    it('should redirect homepage to search when redirectToSearch is enabled', async () => {
      const replaceMock = vi.fn();
      
      // Mock homepage
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/',
          href: 'https://www.bilibili.com/',
          hostname: 'www.bilibili.com',
          replace: replaceMock,
        },
        writable: true,
      });

      // Mock config with redirect enabled - need to mock both check-permission and get-full-config
      mockSendMessage
        .mockResolvedValueOnce({
          allowed: true,
          reason: 'PERMANENT',
        } as PermissionResult)
        .mockResolvedValueOnce({
          config: {
            homepageSimplification: {
              enabled: true,
              redirectToSearch: true,
            },
          },
        });

      vi.resetModules();
      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that redirect was called
      expect(replaceMock).toHaveBeenCalledWith('https://search.bilibili.com/');
    });

    it('should not redirect when redirectToSearch is disabled', async () => {
      const replaceMock = vi.fn();
      
      // Mock homepage
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/',
          href: 'https://www.bilibili.com/',
          hostname: 'www.bilibili.com',
          replace: replaceMock,
        },
        writable: true,
      });

      // Mock config with redirect disabled
      mockSendMessage
        .mockResolvedValueOnce({
          allowed: true,
          reason: 'PERMANENT',
        } as PermissionResult)
        .mockResolvedValueOnce({
          config: {
            homepageSimplification: {
              enabled: true,
              redirectToSearch: false,
            },
          },
        });

      vi.resetModules();
      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that redirect was not called
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('should not redirect on non-homepage pages', async () => {
      const replaceMock = vi.fn();
      
      // Mock video page
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/video/BV1xx',
          href: 'https://www.bilibili.com/video/BV1xx',
          hostname: 'www.bilibili.com',
          replace: replaceMock,
        },
        writable: true,
      });

      // Mock config with redirect enabled
      mockSendMessage
        .mockResolvedValueOnce({
          allowed: true,
          reason: 'PERMANENT',
        } as PermissionResult)
        .mockResolvedValueOnce({
          config: {
            homepageSimplification: {
              enabled: true,
              redirectToSearch: true,
            },
          },
        });

      vi.resetModules();
      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that redirect was not called on video page
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });
});
