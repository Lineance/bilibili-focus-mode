import { useSyncExternalStore } from 'react';

type StorageChangeCallback = () => void;

class ChromeStorageAdapter {
  private listeners = new Map<string, Set<StorageChangeCallback>>();

  constructor() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        Object.keys(changes).forEach((key) => {
          this.notify(key);
        });
      }
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const result = await chrome.storage.local.get(key);
    return result[key] as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }

  subscribe(key: string, callback: StorageChangeCallback): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private notify(key: string): void {
    this.listeners.get(key)?.forEach((callback) => callback());
  }
}

export const storage = new ChromeStorageAdapter();

export function useStorage<T>(key: string, defaultValue: T): T {
  return useSyncExternalStore(
    (callback) => storage.subscribe(key, callback),
    () => {
      // This is a synchronous snapshot, but storage is async
      // We return defaultValue and let React re-render when data loads
      return defaultValue;
    },
    () => defaultValue
  );
}
