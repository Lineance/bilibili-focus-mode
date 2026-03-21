import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStorage } from '@hooks/useStorage';
import type { ExtensionStorage } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';

// Mock chrome.storage
const mockStorage: Partial<ExtensionStorage> = {};
const mockListeners: Array<(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void> = [];

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve(mockStorage)),
      set: vi.fn((data) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn((listener) => mockListeners.push(listener)),
      removeListener: vi.fn((listener) => {
        const index = mockListeners.indexOf(listener);
        if (index > -1) mockListeners.splice(index, 1);
      }),
    },
  },
});

describe('useStorage', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    mockListeners.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return default storage initially', () => {
    const { result } = renderHook(() => useStorage());
    
    expect(result.current).toEqual(DEFAULT_STORAGE);
  });

  it('should load storage from chrome.storage.local', async () => {
    const customStorage: Partial<ExtensionStorage> = {
      limboList: [
        {
          bvid: 'BV1xx',
          title: 'Test Video',
          uploader: 'Test',
          coverUrl: '',
          tag: 'ENTERTAINMENT',
          addedAt: Date.now(),
          sourceUrl: 'https://bilibili.com',
        },
      ],
    };
    
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(customStorage);
    
    const { result } = renderHook(() => useStorage());
    
    await waitFor(() => {
      expect(result.current.limboList).toHaveLength(1);
    });
    
    expect(result.current.limboList[0].bvid).toBe('BV1xx');
  });

  it('should update when storage changes', async () => {
    const { result } = renderHook(() => useStorage());
    
    // Simulate storage change
    const changeEvent = {
      limboList: {
        oldValue: [],
        newValue: [
          {
            bvid: 'BV2xx',
            title: 'New Video',
            uploader: 'Test',
            coverUrl: '',
            tag: 'LEARNING',
            addedAt: Date.now(),
            sourceUrl: 'https://bilibili.com',
          },
        ],
      },
    };
    
    // Trigger the listener
    mockListeners.forEach((listener) => listener(changeEvent, 'local'));
    
    await waitFor(() => {
      expect(result.current.limboList).toHaveLength(1);
    });
    
    expect(result.current.limboList[0].tag).toBe('LEARNING');
  });

  it('should not update for non-local storage changes', async () => {
    const { result } = renderHook(() => useStorage());
    
    const initialLimboList = result.current.limboList;
    
    // Simulate sync storage change (should be ignored)
    const changeEvent = {
      limboList: {
        oldValue: [],
        newValue: [{ bvid: 'BV3xx' }],
      },
    };
    
    mockListeners.forEach((listener) => listener(changeEvent, 'sync'));
    
    // Should not update
    expect(result.current.limboList).toEqual(initialLimboList);
  });
});
