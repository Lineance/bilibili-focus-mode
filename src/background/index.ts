import { onMessage } from 'webext-bridge/background';
import { PermissionService } from '@core/services';
import { DEFAULT_STORAGE } from '@core/constants';
import type { ProtocolMap } from '@core/protocol';

console.log('[Background] Service worker started');

// Initialize storage on install
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    chrome.storage.local.set(DEFAULT_STORAGE).then(() => {
      console.log('[Background] Default storage initialized');
    });
  }
});

// Handle alarms for scheduled tasks
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[Background] Alarm triggered:', alarm.name);
  
  if (alarm.name === 'limbo-review-reminder') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Bilibili Focus Mode',
      message: 'Time to review your Limbo list!',
    });
  }
});

// Message handlers
onMessage('check-permission', async (message) => {
  const data = message.data as unknown as ProtocolMap['check-permission']['req'];
  console.log('[Background] Checking permission for:', data.bvid);
  
  const storage = await chrome.storage.local.get() as typeof DEFAULT_STORAGE;
  const service = new PermissionService(storage);
  return service.check(data.bvid);
});

onMessage('add-to-limbo', async (message) => {
  const data = message.data as unknown as ProtocolMap['add-to-limbo']['req'];
  console.log('[Background] Adding to limbo:', data.metadata.bvid);
  
  const storage = await chrome.storage.local.get() as typeof DEFAULT_STORAGE;
  console.log('[Background] Current storage:', { 
    limboListLength: storage.limboList?.length || 0,
    limboCapacity: storage.config?.limboCapacity 
  });
  
  const limboList = storage.limboList || [];
  const capacity = storage.config?.limboCapacity ?? 5;
  
  // Check capacity
  if (limboList.length >= capacity) {
    console.log('[Background] Limbo is full:', limboList.length, '>=', capacity);
    return { success: false, limboCount: limboList.length };
  }
  
  // Check if already exists
  if (limboList.some((item) => item.bvid === data.metadata.bvid)) {
    console.log('[Background] Video already in limbo:', data.metadata.bvid);
    return { success: true, limboCount: limboList.length };
  }
  
  const newItem = {
    ...data.metadata,
    sourceUrl: data.sourceUrl,
  };
  
  const newLimboList = [...limboList, newItem];
  await chrome.storage.local.set({
    limboList: newLimboList,
  });
  
  console.log('[Background] Video added to limbo. New count:', newLimboList.length);
  
  return { success: true, limboCount: newLimboList.length };
});

onMessage('update-debt', async (message) => {
  const data = message.data as unknown as ProtocolMap['update-debt']['req'];
  console.log('[Background] Updating debt:', data);
  
  const storage = await chrome.storage.local.get();
  const debtAccount = (storage.debtAccount || { currentDebt: 0 }) as { currentDebt: number };
  
  let newDebt = debtAccount.currentDebt;
  if (data.type === 'accrue') {
    newDebt += data.minutes;
  } else {
    newDebt = Math.max(0, newDebt - data.minutes);
  }
  
  await chrome.storage.local.set({
    debtAccount: {
      ...debtAccount,
      currentDebt: newDebt,
    },
  });
  
  return { currentDebt: newDebt };
});

// Schedule daily reminder
chrome.alarms.create('limbo-review-reminder', {
  when: new Date().setHours(19, 30, 0, 0),
  periodInMinutes: 24 * 60,
});

// Handle open options page request from content script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'openOptionsPage') {
    console.log('[Background] Opening options page');
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/manager/index.html')
    }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Error opening options page:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Background] Options page opened in tab:', tab?.id);
        sendResponse({ success: true, tabId: tab?.id });
      }
    });
    return true; // Keep message channel open for async response
  }
});
