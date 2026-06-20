import { ensureStorageDefaults } from './utils';

export async function handleGetFullConfig(): Promise<unknown> {
  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;
  return { config };
}
