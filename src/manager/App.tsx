import { useState } from 'react';
import { useStorage } from '@hooks/useStorage';
import type { LimboItem, ExtensionStorage } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';

export function App() {
  const [activeTab, setActiveTab] = useState<'limbo' | 'cooling' | 'instant' | 'permanent' | 'ghost' | 'debt'>('limbo');
  const storage = useStorage<ExtensionStorage>('version', DEFAULT_STORAGE);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bilibili Focus Mode</h1>
        <p className="text-gray-400">意图性娱乐时间管理工具</p>
      </header>

      <nav className="flex gap-4 mb-6 border-b border-gray-700 pb-4">
        {[
          { id: 'limbo', label: '待审池', count: storage.limboList?.length || 0 },
          { id: 'cooling', label: '冷静期', count: storage.coolingList?.length || 0 },
          { id: 'instant', label: '即时许可', count: storage.instantList?.length || 0 },
          { id: 'permanent', label: '永久分组', count: storage.permanentGroups?.length || 0 },
          { id: 'ghost', label: '幽灵档案', count: storage.ghostList?.length || 0 },
          { id: 'debt', label: '债务', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-700 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'limbo' && <LimboReview items={storage.limboList || []} />}
        {activeTab === 'debt' && <DebtDashboard account={storage.debtAccount} />}
        {/* TODO: Implement other tabs */}
      </main>
    </div>
  );
}

function LimboReview({ items }: { items: readonly LimboItem[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">待审池 ({items.length}/5)</h2>
      {items.length === 0 ? (
        <p className="text-gray-500">待审池为空，在B站播放页添加视频</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.bvid} className="bg-gray-800 p-4 rounded-lg flex gap-4">
              <img
                src={item.coverUrl}
                alt={item.title}
                className="w-32 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-gray-400 mb-2">{item.uploader}</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-green-600 rounded text-sm">学习</button>
                  <button className="px-3 py-1 bg-yellow-600 rounded text-sm">娱乐</button>
                  <button className="px-3 py-1 bg-blue-600 rounded text-sm">冷静期</button>
                  <button className="px-3 py-1 bg-red-600 rounded text-sm">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DebtDashboard({ account }: { account?: { currentDebt: number } }) {
  const debt = account?.currentDebt || 0;
  const isBankrupt = debt >= 60;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">债务仪表盘</h2>
      <div className={`p-6 rounded-lg ${isBankrupt ? 'bg-red-900/50' : 'bg-gray-800'}`}>
        <div className="text-4xl font-bold mb-2">
          {debt.toFixed(1)} 分钟
        </div>
        <p className="text-gray-400">
          {isBankrupt
            ? '⚠️ 已破产！24小时内禁止新申请'
            : debt > 30
            ? '债务较高，建议观看学习类视频偿还'
            : '债务状况良好'}
        </p>
      </div>
    </div>
  );
}
