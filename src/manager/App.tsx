import { DEFAULT_CONFIG } from '@core/constants';
import { logger } from '@core/utils/logger';
import { useStorage } from '@hooks/useStorage';
import { ThemeService } from '@core/services';
import { StorageRepository } from '@core/storage/StorageRepository';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sendMessage } from 'webext-bridge/options';

import {
  ConfigPanel,
  CoolingList,
  DebtDashboard,
  GhostList,
  InstantList,
  KeywordRulesPanel,
  LimboReview,
  PermanentGroups,
  ThemePanel,
  UploaderAllowlist,
} from './components';

type ActiveTab =
  | 'limbo'
  | 'cooling'
  | 'instant'
  | 'permanent'
  | 'ghost'
  | 'debt'
  | 'uploaders'
  | 'keywords'
  | 'config'
  | 'theme';

export function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('limbo');
  const storage = useStorage();

  // Initialize theme service on app mount
  const themeServiceRef = useRef<ThemeService | null>(null);
  useEffect(() => {
    if (!themeServiceRef.current) {
      themeServiceRef.current = new ThemeService();
    }
    themeServiceRef.current.initialize();
  }, []);

  useEffect(() => {
    // Sync debt and bankruptcy status on mount
    sendMessage('sync-debt', {}, 'background').catch(err => {
      console.error('[Manager] Failed to sync debt:', err);
    });
  }, []);

  const tabCounts = useMemo(() => ({
    limbo: storage.limboList?.length || 0,
    cooling: storage.coolingList?.length || 0,
    instant: storage.instantList?.length || 0,
    permanent: storage.permanentGroups?.reduce((sum, g) => sum + g.items.length, 0) || 0,
    ghost: storage.ghostList?.length || 0,
    uploaders: storage.allowedUploaders?.length || 0,
    keywords: storage.config?.keywordRules?.keywords?.length || 0,
  }), [storage.limboList, storage.coolingList, storage.instantList, storage.permanentGroups, storage.ghostList, storage.allowedUploaders, storage.config?.keywordRules?.keywords]);

  const handleExport = async () => {
    try {
      const storage = await StorageRepository.get();
      const exportData = {
        version: 3,
        exportDate: new Date().toISOString(),
        config: storage.config,
        limboList: storage.limboList,
        coolingList: storage.coolingList,
        instantList: storage.instantList,
        permanentGroups: storage.permanentGroups,
        ghostList: storage.ghostList,
        allowedUploaders: storage.allowedUploaders,
        debtAccount: storage.debtAccount,
        globalStats: storage.globalStats,
        behaviorLog: storage.behaviorLog,
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
    } catch (error) {
      console.error('[Manager] Failed to export:', error);
      alert('导出失败，请重试');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.version !== 3) {
        alert('不支持的备份文件版本');
        return;
      }

      if (!confirm('导入将覆盖现有数据，确定要继续吗？')) {
        return;
      }

      await StorageRepository.set({
        config: data.config,
        limboList: data.limboList || [],
        coolingList: data.coolingList || [],
        instantList: data.instantList || [],
        permanentGroups: data.permanentGroups || [],
        ghostList: data.ghostList || [],
        allowedUploaders: data.allowedUploaders || [],
        debtAccount: data.debtAccount,
        globalStats: data.globalStats,
        behaviorLog: data.behaviorLog,
      });

      logger.info('Manager', '导入成功！');
      window.location.reload();
    } catch (error) {
      logger.error('Manager', 'Import error:', error);
      alert('导入失败：文件格式错误');
    }

    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-primary text-primary transition-colors duration-300 p-6">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bilibili Focus Mode</h1>
          <p className="text-secondary">意图性娱乐时间管理工具</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-3 py-1 bg-accent-primary text-white rounded text-sm hover:bg-accent-hover transition-colors">
            导出备份
          </button>
          <label className="px-3 py-1 bg-success text-white rounded text-sm hover:bg-success/80 cursor-pointer transition-colors">
            导入备份
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </header>

      <nav className="flex gap-4 mb-6 border-b border-secondary pb-4 flex-wrap">
        {[
          { id: 'limbo', label: '待审池', count: tabCounts.limbo },
          { id: 'cooling', label: '冷静期', count: tabCounts.cooling },
          { id: 'instant', label: '即时许可', count: tabCounts.instant },
          { id: 'permanent', label: '永久分组', count: tabCounts.permanent },
          { id: 'ghost', label: '幽灵档案', count: tabCounts.ghost },
          { id: 'debt', label: '债务', count: null },
          { id: 'uploaders', label: 'UP 主白名单', count: tabCounts.uploaders },
          { id: 'keywords', label: '关键词规则', count: tabCounts.keywords },
          { id: 'config', label: '配置', count: null },
          { id: 'theme', label: '主题', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-accent-primary text-white' 
                : 'bg-secondary text-secondary hover:bg-accent-hover/50'
            }`}
          >
            {tab.label}
            {tab.count !== null && <span className="ml-2 px-2 py-0.5 text-xs bg-secondary/50 text-primary rounded-full">{tab.count}</span>}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'limbo' && <LimboReview items={storage.limboList || []} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'cooling' && <CoolingList items={storage.coolingList || []} />}
        {activeTab === 'instant' && <InstantList items={storage.instantList || []} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'permanent' && <PermanentGroups groups={storage.permanentGroups || []} />}
        {activeTab === 'ghost' && <GhostList items={storage.ghostList || []} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'debt' && <DebtDashboard account={storage.debtAccount} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'uploaders' && <UploaderAllowlist uploaders={storage.allowedUploaders || []} />}
        {activeTab === 'keywords' && <KeywordRulesPanel config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'config' && <ConfigPanel />}
        {activeTab === 'theme' && <ThemePanel />}
      </main>
    </div>
  );
}