import { useCallback } from 'react';

import { StorageRepository } from '@core/storage/StorageRepository';
import type { ExtensionStorage } from '@core/types';

export function useStorageActions() {
  const deleteFromList = useCallback(
    async <K extends keyof ExtensionStorage>(
      storageKey: K,
      matchValue: string,
      keyField: string = 'bvid'
    ): Promise<boolean> => {
      try {
        await StorageRepository.update(storageKey, (current) => {
          const list = current as unknown as Record<string, unknown>[];
          return list.filter((item) => item[keyField] !== matchValue) as unknown as ExtensionStorage[K];
        });
        return true;
      } catch (error) {
        console.error(`[useStorageActions] Failed to delete from ${String(storageKey)}:`, error);
        return false;
      }
    },
    []
  );

  const batchDelete = useCallback(
    async <K extends keyof ExtensionStorage>(
      storageKey: K,
      matchValues: Set<string>,
      keyField: string = 'bvid'
    ): Promise<boolean> => {
      try {
        await StorageRepository.update(storageKey, (current) => {
          const list = current as unknown as Record<string, unknown>[];
          return list.filter((item) => !matchValues.has(item[keyField] as string)) as unknown as ExtensionStorage[K];
        });
        return true;
      } catch (error) {
        console.error(`[useStorageActions] Failed to batch delete from ${String(storageKey)}:`, error);
        return false;
      }
    },
    []
  );

  const clearList = useCallback(
    async <K extends keyof ExtensionStorage>(storageKey: K): Promise<boolean> => {
      try {
        await StorageRepository.set({ [storageKey]: [] } as Partial<ExtensionStorage>);
        return true;
      } catch (error) {
        console.error(`[useStorageActions] Failed to clear ${String(storageKey)}:`, error);
        return false;
      }
    },
    []
  );

  return { deleteFromList, batchDelete, clearList };
}
