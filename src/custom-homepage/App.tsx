import React, { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '@core/constants';
import type { ExtensionStorage } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';
import { DebtStatus } from './components/DebtStatus';
import { BypassStatus } from './components/BypassStatus';
import { InstantSection } from './components/InstantSection';
import { PermanentSection } from './components/PermanentSection';
import { UploaderSection } from './components/UploaderSection';
import { KeywordSection } from './components/KeywordSection';
import { QuickActions } from './components/QuickActions';

export function App(): React.JSX.Element {
  const [storage, setStorage] = useState<ExtensionStorage | null>(null);

  useEffect(() => {
    const loadStorage = async () => {
      const data = await StorageRepository.get();
      setStorage(data);
    };
    loadStorage();

    const listener = (_changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local') {
        loadStorage();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  if (!storage) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <p className="text-muted">加载中...</p>
      </div>
    );
  }

  const config = storage.config || DEFAULT_CONFIG;

  return (
    <div className="min-h-screen bg-primary text-primary">
      {/* 头部 */}
      <header className="bg-secondary border-b border-secondary sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">🎯 Bilibili Focus Mode</h1>
            <span className="text-sm text-muted">专注首页</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('https://search.bilibili.com/', '_blank')}
              className="btn-primary"
            >
              🔍 搜索
            </button>
            <button
              onClick={() => window.open(chrome.runtime.getURL('src/manager/index.html'), '_blank')}
              className="btn-secondary"
            >
              打开管理页
            </button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 债务仪表盘 */}
        <section className="mb-6">
          <DebtStatus account={storage.debtAccount} config={config} />
        </section>

        {/* 状态栏 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <BypassStatus config={config} behaviorLog={storage.behaviorLog} />
          <QuickActions config={config} />
        </div>

        {/* 即时许可 */}
        <section className="mb-8">
          <InstantSection items={storage.instantList || []} />
        </section>

        {/* 永久分组 */}
        <section className="mb-8">
          <PermanentSection groups={storage.permanentGroups || []} />
        </section>

        {/* 底部区域：UP主和关键词 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <UploaderSection uploaders={storage.allowedUploaders || []} />
          </section>
          <section>
            <KeywordSection config={config} />
          </section>
        </div>
      </main>

      {/* 底部 */}
      <footer className="bg-secondary border-t border-secondary mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted">
          <p>Bilibili Focus Mode - 意图性娱乐，掌控你的时间</p>
        </div>
      </footer>
    </div>
  );
}