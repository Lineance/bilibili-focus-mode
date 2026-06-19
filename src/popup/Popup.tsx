import type { ReactNode } from 'react';
import { BILIBILI_BASE_URL } from '@core/constants';
import './index.css';

export function Popup(): ReactNode {
  return (
    <div className="w-64 p-4 bg-gray-900 text-white">
      <h1 className="text-lg font-bold mb-4">Bilibili Focus Mode</h1>
      <div className="space-y-2">
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full px-4 py-2 bg-accent-primary rounded hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          打开管理页
        </button>
        
        <button
          onClick={() => chrome.tabs.create({ url: BILIBILI_BASE_URL })}
          className="w-full px-4 py-2 bg-tertiary border border-secondary rounded hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          前往B站
        </button>
      </div>
      
      <p className="mt-4 text-xs text-gray-400 text-center">
        快捷键: Ctrl+Shift+A 快速添加
      </p>
    </div>
  );
}
