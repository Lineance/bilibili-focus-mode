import { DEFAULT_CONFIG } from '@core/constants';
import { logger } from '@core/utils/logger';
import { useStorage } from '@hooks/useStorage';
import { StorageRepository } from '@core/storage/StorageRepository';
import { ThemeService } from '@core/services';
import React, { useEffect, useMemo, useState } from 'react';
import { sendMessage } from 'webext-bridge/options';

import {
  ConfigPanel,
  StatsDashboard,
  InstantList,
  KeywordRulesPanel,
  LimboReview,
  PermanentGroups,
  ThemePanel,
  UploaderAllowlist,
} from './components';
import { Button, ConfirmHost, Icon, IconButton, ToastHost, toast } from '@ui';
import type { IconName } from '@ui';

type ActiveTab =
  | 'limbo'
  | 'instant'
  | 'permanent'
  | 'stats'
  | 'uploaders'
  | 'keywords'
  | 'config'
  | 'theme';

const TABS: Array<{ id: ActiveTab; label: string; icon: IconName; countKey?: 'limbo' | 'instant' | 'permanent' | 'uploaders' | 'keywords' }> = [
  { id: 'limbo', label: '待审池', icon: 'list', countKey: 'limbo' },
  { id: 'instant', label: '即时许可', icon: 'bolt', countKey: 'instant' },
  { id: 'permanent', label: '永久分组', icon: 'folder', countKey: 'permanent' },
  { id: 'stats', label: '统计', icon: 'chart' },
  { id: 'uploaders', label: 'UP 主白名单', icon: 'user', countKey: 'uploaders' },
  { id: 'keywords', label: '关键词规则', icon: 'tag', countKey: 'keywords' },
  { id: 'config', label: '配置', icon: 'sliders' },
  { id: 'theme', label: '主题', icon: 'palette' },
];

const themeService = ThemeService.getInstance();

export function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('limbo');
  const [mode, setMode] = useState(themeService.getThemeConfig().mode);
  const storage = useStorage();

  useEffect(() => themeService.subscribe((config) => setMode(config.mode)), []);

  useEffect(() => {
    sendMessage('sync-debt', {}, 'background').catch((err) => {
      console.error('[Manager] Failed to sync debt:', err);
    });
  }, []);

  const tabCounts = useMemo(() => ({
    limbo: storage.limboList?.length || 0,
    instant: storage.instantList?.length || 0,
    permanent: storage.permanentGroups?.reduce((sum, g) => sum + g.items.length, 0) || 0,
    uploaders: storage.allowedUploaders?.length || 0,
    keywords: storage.config?.keywordRules?.keywords?.length || 0,
  }), [storage.limboList, storage.instantList, storage.permanentGroups, storage.allowedUploaders, storage.config?.keywordRules?.keywords]);

  const handleExport = async () => {
    try {
      const data = await StorageRepository.get();
      const exportData = {
        version: 3,
        exportDate: new Date().toISOString(),
        config: data.config,
        limboList: data.limboList,
        instantList: data.instantList,
        permanentGroups: data.permanentGroups,
        allowedUploaders: data.allowedUploaders,
        debtAccount: data.debtAccount,
        globalStats: data.globalStats,
        behaviorLog: data.behaviorLog,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bilibili-focus-mode-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('备份已导出');
    } catch (error) {
      console.error('[Manager] Failed to export:', error);
      toast.error('导出失败，请重试');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.version !== 3) {
        toast.error('不支持的备份文件版本');
        return;
      }

      if (!confirm('导入将覆盖现有数据，确定要继续吗？')) {
        return;
      }

      await StorageRepository.set({
        config: data.config,
        limboList: data.limboList || [],
        instantList: data.instantList || [],
        permanentGroups: data.permanentGroups || [],
        allowedUploaders: data.allowedUploaders || [],
        debtAccount: data.debtAccount,
        globalStats: data.globalStats,
        behaviorLog: data.behaviorLog,
      });

      logger.info('Manager', '导入成功！');
      window.location.reload();
    } catch (error) {
      logger.error('Manager', 'Import error:', error);
      toast.error('导入失败：文件格式错误');
    }

    event.target.value = '';
  };

  return (
    <div className="fm-shell">
      <header className="fm-header">
        <div className="fm-brand">
          <span className="fm-brand__mark" aria-hidden="true">
            <Icon name="shield" size={18} />
          </span>
          <div>
            <h1 className="fm-wordmark">Bilibili Focus Mode</h1>
            <p className="fm-subtitle">意图性娱乐 · 时间资产管理</p>
          </div>
        </div>

        <div className="fm-actions">
          <IconButton
            icon={mode === 'dark' ? 'sun' : 'moon'}
            label={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            onClick={() => themeService.toggleMode()}
          />
          <Button variant="ghost" icon="download" onClick={handleExport}>
            导出备份
          </Button>
          <label className="fm-btn fm-btn--primary">
            <Icon name="upload" size={16} />
            导入备份
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </header>

      <nav className="fm-tabs" role="tablist" aria-label="管理模块">
        {TABS.map((tab) => {
          const count = tab.countKey ? tabCounts[tab.countKey] : null;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`fm-tab${isActive ? ' fm-tab--active' : ''}`}
            >
              <Icon name={tab.icon} size={15} />
              {tab.label}
              {count !== null && <span className="fm-tab__count">{count}</span>}
            </button>
          );
        })}
      </nav>

      <main className="fm-main">
        {activeTab === 'limbo' && <LimboReview items={storage.limboList || []} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'instant' && <InstantList items={storage.instantList || []} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'permanent' && <PermanentGroups groups={storage.permanentGroups || []} />}
        {activeTab === 'stats' && <StatsDashboard watchHistory={storage.watchHistory || []} account={storage.debtAccount} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'uploaders' && <UploaderAllowlist uploaders={storage.allowedUploaders || []} />}
        {activeTab === 'keywords' && <KeywordRulesPanel config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'config' && <ConfigPanel />}
        {activeTab === 'theme' && <ThemePanel />}
      </main>

      <ToastHost />
      <ConfirmHost />
    </div>
  );
}
