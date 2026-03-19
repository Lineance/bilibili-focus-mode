import { DEFAULT_CONFIG } from '@core/constants';
import { useStorage } from '@hooks/useStorage';
import { useState } from 'react';

import {
  ConfigPanel,
  CoolingList,
  DebtDashboard,
  GhostList,
  InstantList,
  KeywordRulesPanel,
  LimboReview,
  PermanentGroups,
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
  | 'config';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('limbo');
  const storage = useStorage();

  const handleExport = async () => {
    const storage = await chrome.storage.local.get();
    const exportData = {
      version: 3,
      exportDate: new Date().toISOString(),
      config: storage.config,
      limboList: storage.limboList || [],
      coolingList: storage.coolingList || [],
      instantList: storage.instantList || [],
      permanentGroups: storage.permanentGroups || [],
      ghostList: storage.ghostList || [],
      allowedUploaders: storage.allowedUploaders || [],
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

      await chrome.storage.local.set({
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

      alert('导入成功！');
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      alert('导入失败：文件格式错误');
    }

    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bilibili Focus Mode</h1>
          <p className="text-gray-400">意图性娱乐时间管理工具</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700">
            导出备份
          </button>
          <label className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700 cursor-pointer">
            导入备份
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </header>

      <nav className="flex gap-4 mb-6 border-b border-gray-700 pb-4 flex-wrap">
        {[
          { id: 'limbo', label: '待审池', count: storage.limboList?.length || 0 },
          { id: 'cooling', label: '冷静期', count: storage.coolingList?.length || 0 },
          { id: 'instant', label: '即时许可', count: storage.instantList?.length || 0 },
          {
            id: 'permanent',
            label: '永久分组',
            count: storage.permanentGroups?.reduce((sum, group) => sum + group.items.length, 0) || 0,
          },
          { id: 'ghost', label: '幽灵档案', count: storage.ghostList?.length || 0 },
          { id: 'debt', label: '债务', count: null },
          { id: 'uploaders', label: 'UP主白名单', count: storage.allowedUploaders?.length || 0 },
          { id: 'keywords', label: '关键词规则', count: storage.config?.keywordRules?.keywords?.length || 0 },
          { id: 'config', label: '配置', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            {tab.label}
            {tab.count !== null && <span className="ml-2 px-2 py-0.5 text-xs bg-gray-700 rounded-full">{tab.count}</span>}
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
      </main>
    </div>
  );
}