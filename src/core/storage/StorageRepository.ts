import { DEFAULT_STORAGE } from '@core/constants';
import type { ExtensionStorage } from '@core/types';
import { storageQueue } from '@core/utils/storageQueue';

export class StorageRepository {
  static async get(): Promise<ExtensionStorage> {
    const data = await chrome.storage.local.get();
    return { ...DEFAULT_STORAGE, ...data } as ExtensionStorage;
  }

  static async getKeys<K extends keyof ExtensionStorage>(...keys: K[]): Promise<Pick<ExtensionStorage, K>> {
    const data = await chrome.storage.local.get(keys);
    const result = {} as Pick<ExtensionStorage, K>;
    for (const key of keys) {
      (result as Record<string, unknown>)[key as string] = data[key as string] ?? DEFAULT_STORAGE[key];
    }
    return result;
  }

  static async set(updates: Partial<ExtensionStorage>): Promise<void> {
    await storageQueue.enqueue(() => chrome.storage.local.set(updates));
  }

  static async update<K extends keyof ExtensionStorage>(
    key: K,
    updater: (current: ExtensionStorage[K]) => ExtensionStorage[K]
  ): Promise<void> {
    const current = await this.getKeys(key);
    const updated = updater(current[key]);
    await this.set({ [key]: updated } as Partial<ExtensionStorage>);
  }
}
