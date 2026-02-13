import { useState } from 'react';
import { useStorage } from '@hooks/useStorage';
import type { LimboItem, VideoMetadata, CoolingItem, InstantItem, PermanentGroup } from '@core/types';
import { ExpirationService } from '@core/services';
import { DEFAULT_CONFIG } from '@core/constants';

// Video cover component with fallback
function VideoCover({ url, title }: { url: string; title: string }) {
  const [error, setError] = useState(false);
  
  if (error || !url) {
    return (
      <div className="w-32 h-20 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
        无封面
      </div>
    );
  }
  
  return (
    <img
      src={url}
      alt={title}
      className="w-32 h-20 object-cover rounded"
      onError={() => setError(true)}
      crossOrigin="anonymous"
    />
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<'limbo' | 'cooling' | 'instant' | 'permanent' | 'ghost' | 'debt'>('limbo');
  const storage = useStorage();

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
        {activeTab === 'cooling' && <CoolingList items={storage.coolingList || []} />}
        {activeTab === 'instant' && <InstantList items={storage.instantList || []} />}
        {activeTab === 'permanent' && <PermanentGroups groups={storage.permanentGroups || []} />}
        {activeTab === 'debt' && <DebtDashboard account={storage.debtAccount} />}
        {/* TODO: Implement ghost tab */}
      </main>
    </div>
  );
}

function LimboReview({ items }: { items: readonly LimboItem[] }) {
  const handleClear = async () => {
    if (confirm('确定要清空待审池吗？')) {
      await chrome.storage.local.set({ limboList: [] });
      alert('待审池已清空');
    }
  };

  const handleAction = async (item: LimboItem, action: 'learning' | 'entertainment' | 'cooling' | 'delete') => {
    const storage = await chrome.storage.local.get();
    const limboList = (storage.limboList || []) as LimboItem[];
    
    // Remove from limbo
    const newLimboList = limboList.filter((i) => i.bvid !== item.bvid);
    
    if (action === 'delete') {
      await chrome.storage.local.set({ limboList: newLimboList });
      alert('已删除');
      return;
    }

    const metadata: VideoMetadata = {
      bvid: item.bvid,
      title: item.title,
      uploader: item.uploader,
      coverUrl: item.coverUrl,
      tag: action === 'learning' ? 'LEARNING' : 'ENTERTAINMENT',
      addedAt: Date.now(),
    };

    if (action === 'cooling') {
      // Add to cooling list
      const expirationService = new ExpirationService(
        DEFAULT_CONFIG.coolingCooldownHours,
        DEFAULT_CONFIG.coolingAvailableHours,
        DEFAULT_CONFIG.instantDurationHours,
        DEFAULT_CONFIG.ghostLifespanDays
      );
      const coolingItem = expirationService.createCoolingItem(metadata);
      const coolingList = (storage.coolingList || []) as CoolingItem[];
      await chrome.storage.local.set({
        limboList: newLimboList,
        coolingList: [...coolingList, coolingItem],
      });
      alert(`已加入冷静期，将在 ${DEFAULT_CONFIG.coolingCooldownHours} 小时后可用`);
    } else if (action === 'learning' || action === 'entertainment') {
      // Add to permanent group
      const permanentGroups = (storage.permanentGroups || []) as PermanentGroup[];
      
      // Find or create default group
      let targetGroup = permanentGroups[0];
      if (!targetGroup) {
        targetGroup = {
          id: 'default',
          name: '默认分组',
          items: [],
          debtPriority: 1,
        };
        permanentGroups.push(targetGroup);
      }
      
      // Check if already exists
      if (!targetGroup.items.some((i) => i.bvid === item.bvid)) {
        targetGroup.items.push(metadata);
      }
      
      await chrome.storage.local.set({
        limboList: newLimboList,
        permanentGroups,
      });
      alert(`已加入永久分组${action === 'learning' ? '（学习类，可偿还债务）' : '（娱乐类，会产生债务）'}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">待审池 ({items.length}/5)</h2>
        {items.length > 0 && (
          <button
            onClick={handleClear}
            className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
          >
            清空待审池
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-gray-500">待审池为空，在B站播放页添加视频</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.bvid} className="bg-gray-800 p-4 rounded-lg flex gap-4">
              <VideoCover url={item.coverUrl} title={item.title} />
              <div className="flex-1">
                <h3 className="font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-gray-400 mb-2">{item.uploader}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(item, 'learning')}
                    className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700"
                  >
                    学习
                  </button>
                  <button
                    onClick={() => handleAction(item, 'entertainment')}
                    className="px-3 py-1 bg-yellow-600 rounded text-sm hover:bg-yellow-700"
                  >
                    娱乐
                  </button>
                  <button
                    onClick={() => handleAction(item, 'cooling')}
                    className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
                  >
                    冷静期
                  </button>
                  <button
                    onClick={() => handleAction(item, 'delete')}
                    className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CoolingList({ items }: { items: readonly CoolingItem[] }) {
  const now = Date.now();
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">冷静期 ({items.length})</h2>
      {items.length === 0 ? (
        <p className="text-gray-500">没有处于冷静期的视频</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const isAvailable = now >= item.availableAt;
            const isExpired = now >= item.expiresAt;
            
            return (
              <div key={item.bvid} className="bg-gray-800 p-4 rounded-lg flex gap-4">
                <img
                  src={item.coverUrl}
                  alt={item.title}
                  className="w-32 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{item.uploader}</p>
                  <p className={`text-sm ${isExpired ? 'text-red-400' : isAvailable ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isExpired
                      ? '已过期'
                      : isAvailable
                      ? '可观看'
                      : `还需等待 ${Math.ceil((item.availableAt - now) / 3600000)} 小时`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InstantList({ items }: { items: readonly InstantItem[] }) {
  const now = Date.now();
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">即时许可 ({items.length})</h2>
      {items.length === 0 ? (
        <p className="text-gray-500">没有即时许可</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const isExpired = now >= item.expiresAt;
            const hoursLeft = Math.ceil((item.expiresAt - now) / 3600000);
            
            return (
              <div key={item.bvid} className="bg-gray-800 p-4 rounded-lg flex gap-4">
                <img
                  src={item.coverUrl}
                  alt={item.title}
                  className="w-32 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{item.uploader}</p>
                  <p className={`text-sm ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                    {isExpired ? '已过期' : `剩余 ${hoursLeft} 小时`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PermanentGroups({ groups }: { groups: readonly PermanentGroup[] }) {
  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">永久分组 ({groups.length} 组, {totalItems} 个视频)</h2>
      {groups.length === 0 ? (
        <p className="text-gray-500">没有永久分组</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.id} className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-3">{group.name} ({group.items.length})</h3>
              <div className="grid gap-3">
                {group.items.map((item) => (
                  <div key={item.bvid} className="flex gap-3 items-center bg-gray-700 p-3 rounded">
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="w-20 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.uploader}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        item.tag === 'LEARNING'
                          ? 'bg-green-600'
                          : 'bg-yellow-600'
                      }`}
                    >
                      {item.tag === 'LEARNING' ? '学习' : '娱乐'}
                    </span>
                  </div>
                ))}
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
