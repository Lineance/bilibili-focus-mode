import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStorage } from '@hooks/useStorage';
import type { ExtensionStorage } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';

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
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    mockListeners.length = 0;
  });

  afterEach(() => vi.clearAllMocks());

  it('should return default storage initially', () => {
    const { result } = renderHook(() => useStorage());

    expect(result.current).toEqual(DEFAULT_STORAGE);
  });

  it('should load permanent groups from chrome.storage.local', async () => {
    const customStorage: Partial<ExtensionStorage> = {
      permanentGroups: [{
        id: 'learning',
        name: '学习',
        debtPriority: 1,
        items: [{
          bvid: 'BV1xx',
          title: 'Test Video',
          uploader: 'Test',
          coverUrl: '',
          tag: 'LEARNING',
          addedAt: Date.now(),
        }],
      }],
    };

    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(customStorage);

    const { result } = renderHook(() => useStorage());

    await waitFor(() => expect(result.current.permanentGroups).toHaveLength(1));
    expect(result.current.permanentGroups[0].items[0].bvid).toBe('BV1xx');
  });

  it('should update when local permanent groups change', async () => {
    const { result } = renderHook(() => useStorage());
    const changeEvent = {
      permanentGroups: {
        oldValue: [],
        newValue: [{
          id: 'music',
          name: '音乐',
          debtPriority: 3,
          items: [],
        }],
      },
    };

    mockListeners.forEach((listener) => listener(changeEvent, 'local'));

    await waitFor(() => expect(result.current.permanentGroups[0].id).toBe('music'));
  });

  it('should ignore non-local storage changes', () => {
    const { result } = renderHook(() => useStorage());
    const initialGroups = result.current.permanentGroups;

    mockListeners.forEach((listener) => listener({
      permanentGroups: { oldValue: [], newValue: [] },
    }, 'sync'));

    expect(result.current.permanentGroups).toEqual(initialGroups);
  });
});
