import { useEffect, useState } from 'react';
import type { ExtensionStorage } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';

export function useStorage(): ExtensionStorage {
  const [storage, setStorage] = useState<ExtensionStorage>(DEFAULT_STORAGE);

  useEffect(() => {
    // Load initial value
    chrome.storage.local.get().then((result: Partial<ExtensionStorage>) => {
      console.log('[useStorage] Loaded storage:', result);
      if (Object.keys(result).length > 0) {
        setStorage({
          ...DEFAULT_STORAGE,
          ...result,
        });
      }
    });

    // Listen for changes
    const handleChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        setStorage((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(changes).map(([key, change]) => [key, change.newValue])
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
