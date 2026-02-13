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
      expect(overlay?.textContent).toContain('视频已拦截');
      expect(overlay?.textContent).toContain('未获得观看许可');
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
    it('should send add-to-limbo message when button clicked', async () => {
      document.body.innerHTML = `
        <h1 class="video-title">Test Video</h1>
        <div class="up-name">Uploader</div>
      `;

      // Mock permission denied to show overlay
      mockSendMessage
        .mockResolvedValueOnce({ allowed: false, reason: 'NO_PERMISSION' } as PermissionResult)
        .mockResolvedValueOnce({ success: true, limboCount: 1 });

      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Click add to limbo button
      const addButton = document.querySelector('#bfm-add-limbo') as HTMLButtonElement;
      expect(addButton).toBeTruthy();

      addButton?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify add-to-limbo message was sent
      expect(mockSendMessage).toHaveBeenCalledWith(
        'add-to-limbo',
        expect.objectContaining({
          metadata: expect.objectContaining({
            bvid: 'BV1xx411c7mD',
            title: 'Test Video',
            uploader: 'Uploader',
          }),
          sourceUrl: 'https://www.bilibili.com/video/BV1xx411c7mD',
        })
      );
    });
  });

  describe('Open Manager', () => {
    it('should send message to open manager', async () => {
      document.body.innerHTML = `
        <h1 class="video-title">Test Video</h1>
        <div class="up-name">Uploader</div>
      `;

      // Mock permission denied to show overlay
      mockSendMessage
        .mockResolvedValueOnce({ allowed: false, reason: 'NO_PERMISSION' } as PermissionResult)
        .mockResolvedValueOnce({ success: true, tabId: 123 });

      await import('./index');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Click open manager button
      const managerButton = document.querySelector('#bfm-open-manager') as HTMLButtonElement;
      expect(managerButton).toBeTruthy();

      managerButton?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify message was sent to background
      expect(mockSendMessage).toHaveBeenCalledWith(
        { action: 'openOptionsPage' },
        expect.any(Function)
      );
    });
  });
});
