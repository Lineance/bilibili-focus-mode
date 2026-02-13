import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_STORAGE } from '@core/constants';

// Mock chrome APIs
const mockStorage: Record<string, unknown> = {};
const mockListeners: Array<(request: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void> = [];

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys?: string | string[] | Record<string, unknown> | null) => {
        if (!keys) return Promise.resolve(mockStorage);
        if (typeof keys === 'string') return Promise.resolve({ [keys]: mockStorage[keys] });
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          keys.forEach((key) => {
            if (key in mockStorage) result[key] = mockStorage[key];
          });
          return Promise.resolve(result);
        }
        return Promise.resolve(keys);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn((listener) => mockListeners.push(listener)),
    },
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    lastError: null,
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  notifications: {
    create: vi.fn(),
  },
  tabs: {
    create: vi.fn((options, callback) => {
      const tab = { id: 123, url: options.url };
      if (callback) callback(tab);
      return Promise.resolve(tab);
    }),
  },
});

describe('Background Script', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    mockListeners.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Storage Initialization', () => {
    it('should initialize storage on install', async () => {
      // Import the background script to trigger initialization
      await import('./index');

      // Get the onInstalled listener
      const onInstalledListener = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls[0]?.[0];
      expect(onInstalledListener).toBeDefined();

      // Simulate install event
      onInstalledListener?.({ reason: 'install' } as chrome.runtime.InstalledDetails);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify storage was initialized
      expect(chrome.storage.local.set).toHaveBeenCalledWith(DEFAULT_STORAGE);
    });

    it('should not reinitialize on update', async () => {
      await import('./index');

      const onInstalledListener = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls[0]?.[0];
      
      // Simulate update event
      onInstalledListener?.({ reason: 'update' } as chrome.runtime.InstalledDetails);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not set storage on update
      expect(chrome.storage.local.set).not.toHaveBeenCalledWith(DEFAULT_STORAGE);
    });
  });

  describe('Alarm Handling', () => {
    it('should create daily reminder alarm', async () => {
      await import('./index');

      expect(chrome.alarms.create).toHaveBeenCalledWith(
        'limbo-review-reminder',
        expect.objectContaining({
          periodInMinutes: 24 * 60,
        })
      );
    });

    it('should show notification on alarm', async () => {
      await import('./index');

      const onAlarmListener = vi.mocked(chrome.alarms.onAlarm.addListener).mock.calls[0]?.[0];
      expect(onAlarmListener).toBeDefined();

      // Simulate alarm
      onAlarmListener?.({ name: 'limbo-review-reminder' } as chrome.alarms.Alarm);

      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'basic',
          title: 'Bilibili Focus Mode',
          message: 'Time to review your Limbo list!',
        })
      );
    });
  });

  describe('Open Options Page', () => {
    it('should open options page in new tab', async () => {
      await import('./index');

      const onMessageListener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]?.[0];
      expect(onMessageListener).toBeDefined();

      const sendResponse = vi.fn();
      const result = onMessageListener?.(
        { action: 'openOptionsPage' },
        {},
        sendResponse
      );

      // Should return true to keep channel open
      expect(result).toBe(true);

      // Wait for async
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(chrome.tabs.create).toHaveBeenCalledWith(
        { url: 'chrome-extension://test-id/src/manager/index.html' },
        expect.any(Function)
      );

      expect(sendResponse).toHaveBeenCalledWith({ success: true, tabId: 123 });
    });

    it('should handle error when opening options page', async () => {
      vi.mocked(chrome.tabs.create).mockImplementationOnce((_options, callback) => {
        (chrome.runtime as { lastError: { message: string } | null }).lastError = { message: 'Test error' };
        if (callback) callback(undefined as unknown as chrome.tabs.Tab);
        (chrome.runtime as { lastError: { message: string } | null }).lastError = null;
        return Promise.resolve(undefined as unknown as chrome.tabs.Tab);
      });

      await import('./index');

      const onMessageListener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]?.[0];
      const sendResponse = vi.fn();

      onMessageListener?.({ action: 'openOptionsPage' }, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });
});
