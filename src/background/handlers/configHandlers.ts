import { DEFAULT_STORAGE } from '@core/constants';
import { ensureStorageDefaults } from './utils';

export async function handleGetFullConfig(
  _request: unknown,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const config = storage.config;
  const debtAccount = storage.debtAccount || DEFAULT_STORAGE.debtAccount;
  return { config, debtAccount };
}
