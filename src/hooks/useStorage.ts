import { useEffect, useState } from 'react';
import type { ExtensionStorage } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';
import { logger } from '@core/utils/logger';

export function useStorage(): ExtensionStorage {
  const [storage, setStorage] = useState<ExtensionStorage>(DEFAULT_STORAGE);

  useEffect(() => {
    // Load initial value
    chrome.storage.local.get()
      .then((result: Partial<ExtensionStorage>) => {
        logger.debug('useStorage', 'Loaded storage:', result);
        if (Object.keys(result).length > 0) {
          setStorage({
            ...DEFAULT_STORAGE,
            ...result,
          });
        }
      })
      .catch((error) => {
        logger.error('useStorage', 'Failed to load storage:', error);
      });

    // Listen for changes
    const handleChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        setStorage((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(changes)
              .filter(([, change]) => change.newValue !== undefined)
              .map(([key, change]) => [key, change.newValue])
          ),
        }));
      }
    };

    chrome.storage.onChanged.addListener(handleChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, []);

  return storage;
}

// Granular selector hook for components that only need specific fields
export function useStorageField<K extends keyof ExtensionStorage>(key: K): ExtensionStorage[K] {
  const [value, setValue] = useState<ExtensionStorage[K]>(DEFAULT_STORAGE[key]);

  useEffect(() => {
    chrome.storage.local.get(key)
      .then((result) => {
        if (result[key] !== undefined) {
          setValue(result[key] as ExtensionStorage[K]);
        }
      })
      .catch((error) => {
        logger.error('useStorageField', `Failed to load ${key}:`, error);
      });

    const handleChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[key]) {
        setValue(changes[key].newValue as ExtensionStorage[K]);
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, [key]);

  return value;
}
