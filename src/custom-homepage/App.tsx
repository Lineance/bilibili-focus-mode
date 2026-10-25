import React, { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '@core/constants';
import type { ExtensionStorage } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';
import { ThemeService } from '@core/services';
import { Icon, IconButton } from '@ui';
import { DebtStatus } from './components/DebtStatus';
import { BypassStatus } from './components/BypassStatus';
import { InstantSection } from './components/InstantSection';
import { PermanentSection } from './components/PermanentSection';
import { UploaderSection } from './components/UploaderSection';
import { KeywordSection } from './components/KeywordSection';
import { QuickActions } from './components/QuickActions';

const themeService = ThemeService.getInstance();

export function App(): React.JSX.Element {
  const [storage, setStorage] = useState<ExtensionStorage | null>(null);
  const [mode, setMode] = useState(themeService.getThemeConfig().mode);

  useEffect(() => themeService.subscribe((config) => setMode(config.mode)), []);

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
      <div className="fm-shell grid min-h-screen place-items-center">
        <p className="fm-hint">加载中…</p>
      </div>
    );
  }

  const config = storage.config || DEFAULT_CONFIG;

  return (
    <div className="fm-shell">
      <header className="fm-header">
        <div className="fm-brand">
          <span className="fm-brand__mark" aria-hidden="true">
            <Icon name="shield" size={18} />
          </span>
          <div>
            <h1 className="fm-wordmark">专注首页</h1>
            <p className="fm-subtitle">Bilibili Focus Mode</p>
          </div>
        </div>

        <div className="fm-actions">
          <IconButton
            icon={mode === 'dark' ? 'sun' : 'moon'}
            label={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            onClick={() => themeService.toggleMode()}
          />
          <button
            type="button"
            onClick={() => window.open('https://search.bilibili.com/', '_blank')}
            className="fm-btn fm-btn--ghost"
          >
            <Icon name="search" size={16} />
            搜索
          </button>
          <button
            type="button"
            onClick={() => window.open(chrome.runtime.getURL('src/manager/index.html'), '_blank')}
            className="fm-btn fm-btn--primary"
          >
            <Icon name="sliders" size={16} />
            打开管理页
          </button>
        </div>
      </header>

      <main className="fm-main">
        <section className="mb-6">
          <DebtStatus account={storage.debtAccount} config={config} watchHistory={storage.watchHistory || []} />
        </section>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <BypassStatus config={config} behaviorLog={storage.behaviorLog} />
          <QuickActions config={config} />
        </div>

        <section className="mb-8">
          <InstantSection items={storage.instantList || []} />
        </section>

        <section className="mb-8">
          <PermanentSection groups={storage.permanentGroups || []} />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section>
            <UploaderSection uploaders={storage.allowedUploaders || []} />
          </section>
          <section>
            <KeywordSection config={config} />
          </section>
        </div>
      </main>

      <footer className="mt-10 border-t border-secondary py-6 text-center">
        <p className="fm-hint">Bilibili Focus Mode · 意图性娱乐，掌控你的时间</p>
      </footer>
    </div>
  );
}
