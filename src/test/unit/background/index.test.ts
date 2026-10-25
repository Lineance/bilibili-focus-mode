import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_STORAGE } from '@core/constants';

// Mock webextension-polyfill before webext-bridge imports it
// This MUST be before any imports that use webext-bridge
vi.mock('webextension-polyfill', async () => {
  // Create a mock implementation
  const mockImplementation = {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
      getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
      lastError: null,
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    alarms: {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    },
    notifications: {
      create: vi.fn(),
    },
    tabs: {
      create: vi.fn(),
    },
  };
  
  return {
    default: mockImplementation,
  };
});

// Mock webext-bridge after polyfill is mocked
vi.mock('webext-bridge/background', () => ({
  onMessage: vi.fn(),
}));

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
      remove: vi.fn((keys: string[]) => {
        for (const key of keys) delete mockStorage[key];
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    onStartup: {
      addListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn((listener) => mockListeners.push(listener)),
    },
    onMessageExternal: {
      addListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    lastError: null,
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn().mockResolvedValue(true),
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
      await import('@background/index');

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

    it('should migrate storage on update', async () => {
      await import('@background/index');

      const onInstalledListener = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls[0]?.[0];
      
      // Simulate update event
      onInstalledListener?.({ reason: 'update' } as chrome.runtime.InstalledDetails);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should set storage on update for migration
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });


  describe('Storage Migration', () => {
    it('should preserve supported data and remove legacy approval state', async () => {
      const { migrateStorage } = await import('@background/index');
      const legacyStorage = {
        ...DEFAULT_STORAGE,
        version: 3,
        config: {
          ...DEFAULT_STORAGE.config,
          timeWindowEnabled: true,
          themeEnhancement: { darkModeFollowSystem: true, replaceCover: true },
        },
        limboList: [{ bvid: 'BVpending' }],
        instantList: [{ bvid: 'BVinstant' }],
        permanentGroups: [{ id: 'learning', name: '学习', debtPriority: 1, items: [] }],
      };

      await migrateStorage(legacyStorage);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
        version: 4,
        permanentGroups: legacyStorage.permanentGroups,
        config: expect.not.objectContaining({
          timeWindowEnabled: expect.anything(),
          themeEnhancement: expect.anything(),
        }),
      }));
      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        'limboList',
        'instantList',
        'timeWindowBreakUntil',
        'timeWindowFuse',
        'timeWindowFuseExpiresAt',
      ]);
    });
  });

  describe('Open Options Page', () => {
    it('should register open-options-page handler via webext-bridge', async () => {
      const { onMessage } = await import('webext-bridge/background');
      await import('@background/index');

      // Find the handler registered for 'open-options-page'
      const calls = vi.mocked(onMessage).mock.calls;
      const openPageCall = calls.find(([key]) => key === 'open-options-page');
      expect(openPageCall).toBeDefined();

      const handler = openPageCall![1] as (message: { data: unknown }) => Promise<unknown>;
      const result = await handler({ data: {} });

      expect(chrome.tabs.create).toHaveBeenCalledWith(
        { url: 'chrome-extension://test-id/src/manager/index.html' },
        expect.any(Function)
      );

      expect(result).toEqual({ success: true, tabId: 123 });
    });

    it('should handle error when opening options page', async () => {
      vi.mocked(chrome.tabs.create).mockImplementationOnce((_options, callback) => {
        (chrome.runtime as { lastError: { message: string } | null }).lastError = { message: 'Test error' };
        if (callback) callback(undefined as unknown as chrome.tabs.Tab);
        (chrome.runtime as { lastError: { message: string } | null }).lastError = null;
        return Promise.resolve(undefined as unknown as chrome.tabs.Tab);
      });

      const { onMessage } = await import('webext-bridge/background');
      await import('@background/index');

      const calls = vi.mocked(onMessage).mock.calls;
      const openPageCall = calls.find(([key]) => key === 'open-options-page');
      const handler = openPageCall![1] as (message: { data: unknown }) => Promise<unknown>;
      const result = await handler({ data: {} });

      expect(result).toEqual(expect.objectContaining({ success: false }));
    });
  });
});
