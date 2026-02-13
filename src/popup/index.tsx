import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

export function Popup() {
  return (
    <div className="w-64 p-4 bg-gray-900 text-white">
      <h1 className="text-lg font-bold mb-4">Bilibili Focus Mode</h1>
      <div className="space-y-2">
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          打开管理页
        </button>
        
        <button
          onClick={() => chrome.tabs.create({ url: 'https://www.bilibili.com' })}
          className="w-full px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          前往B站
        </button>
      </div>
      
      <p className="mt-4 text-xs text-gray-500 text-center">
        快捷键: Ctrl+Shift+A 快速添加
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
