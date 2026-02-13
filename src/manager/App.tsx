import { useState } from 'react';
import { useStorage } from '@hooks/useStorage';
import type { LimboItem, VideoMetadata, CoolingItem, InstantItem, PermanentGroup, GhostItem } from '@core/types';
import { ExpirationService } from '@core/services';
import { DEFAULT_CONFIG } from '@core/constants';

// Video cover component with fallback
function VideoCover({ url, title, small = false }: { url: string; title: string; small?: boolean }) {
  const [error, setError] = useState(false);
  const sizeClass = small ? 'w-20 h-12' : 'w-32 h-20';
  
  if (error || !url) {
    return (
      <div className={`${sizeClass} bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400`}>
        无封面
      </div>
    );
  }
  
  return (
    <img
      src={url}
      alt={title}
      className={`${sizeClass} object-cover rounded`}
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
        {activeTab === 'ghost' && <GhostList items={storage.ghostList || []} />}
        {activeTab === 'debt' && <DebtDashboard account={storage.debtAccount} />}
      </main>
    </div>
  );
}

// Generic item card with checkbox for batch selection
function ItemCard({
  item,
  selected,
  onSelect,
  onDelete,
  children,
}: {
  item: { bvid: string; title: string; uploader: string; coverUrl: string };
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`bg-gray-800 p-4 rounded-lg flex gap-4 items-center ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
      />
      <VideoCover url={item.coverUrl} title={item.title} />
      <div className="flex-1">
        <h3 className="font-medium mb-1">{item.title}</h3>
        <p className="text-sm text-gray-400">{item.uploader}</p>
        {children}
      </div>
      <button
        onClick={onDelete}
        className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
        title="删除"
      >
        删除
      </button>
    </div>
  );
}

// Batch operations toolbar
function BatchToolbar({
  selectedCount,
  onSelectAll,
  onDeleteSelected,
  onClearSelection,
  totalCount,
}: {
  selectedCount: number;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  totalCount: number;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg px-6 py-3 flex items-center gap-4 shadow-lg z-50">
      <span className="text-sm">已选择 {selectedCount} 项</span>
      <div className="flex gap-2">
        <button
          onClick={onSelectAll}
          className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
        >
          全选 ({totalCount})
        </button>
        <button
          onClick={onClearSelection}
          className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
        >
          取消选择
        </button>
        <button
          onClick={onDeleteSelected}
          className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
        >
          批量删除
        </button>
      </div>
    </div>
  );
}

function LimboReview({ items }: { items: readonly LimboItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  // Check if currently in review window
  const now = new Date();
  const [windowStartHour, windowStartMinute] = DEFAULT_CONFIG.windowStart.split(':').map(Number);
  const [windowEndHour, windowEndMinute] = DEFAULT_CONFIG.windowEnd.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = windowStartHour * 60 + windowStartMinute;
  const endMinutes = windowEndHour * 60 + windowEndMinute;
  
  let isInReviewWindow: boolean;
  if (endMinutes >= startMinutes) {
    isInReviewWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    isInReviewWindow = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  const toggleSelection = (bvid: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(bvid)) {
      newSelected.delete(bvid);
    } else {
      newSelected.add(bvid);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(items.map((item) => item.bvid)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;
    
    const storage = await chrome.storage.local.get();
    const limboList = (storage.limboList || []) as LimboItem[];
    const newLimboList = limboList.filter((item) => item.bvid !== bvid);
    await chrome.storage.local.set({ limboList: newLimboList });
    
    // Remove from selection if selected
    const newSelected = new Set(selected);
    newSelected.delete(bvid);
    setSelected(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;

    const storage = await chrome.storage.local.get();
    const limboList = (storage.limboList || []) as LimboItem[];
    const newLimboList = limboList.filter((item) => !selected.has(item.bvid));
    await chrome.storage.local.set({ limboList: newLimboList });
    setSelected(new Set());
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空待审池吗？')) return;
    await chrome.storage.local.set({ limboList: [] });
    setSelected(new Set());
  };

  const handleAction = async (item: LimboItem, action: 'permanent' | 'cooling' | 'instant') => {
    // Check if in review window
    if (!isInReviewWindow) {
      alert('当前不在审批时间窗口，无法处理待审池视频\n请在 ' + DEFAULT_CONFIG.windowStart + ' - ' + DEFAULT_CONFIG.windowEnd + ' 期间进行审批');
      return;
    }
    
    const storage = await chrome.storage.local.get();
    const limboList = (storage.limboList || []) as LimboItem[];
    const newLimboList = limboList.filter((i) => i.bvid !== item.bvid);

    const metadata: VideoMetadata = {
      bvid: item.bvid,
      title: item.title,
      uploader: item.uploader,
      coverUrl: item.coverUrl,
      tag: item.tag, // Keep the original tag selected when adding to limbo
      addedAt: Date.now(),
    };

    if (action === 'cooling') {
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
    } else if (action === 'instant') {
      const expirationService = new ExpirationService(
        DEFAULT_CONFIG.coolingCooldownHours,
        DEFAULT_CONFIG.coolingAvailableHours,
        DEFAULT_CONFIG.instantDurationHours,
        DEFAULT_CONFIG.ghostLifespanDays
      );
      const instantItem = expirationService.createInstantItem(metadata, ''); // Empty fuse code for now
      const instantList = (storage.instantList || []) as InstantItem[];
      await chrome.storage.local.set({
        limboList: newLimboList,
        instantList: [...instantList, instantItem],
      });
      alert(`已加入即时许可，有效期 ${DEFAULT_CONFIG.instantDurationHours} 小时`);
    } else {
      const permanentGroups = (storage.permanentGroups || []) as PermanentGroup[];
      
      // Find or create group based on tag
      const groupName = item.tag === 'LEARNING' ? '学习' : '娱乐';
      const groupId = item.tag === 'LEARNING' ? 'learning' : 'entertainment';
      
      let targetGroup = permanentGroups.find(g => g.id === groupId);
      if (!targetGroup) {
        targetGroup = {
          id: groupId,
          name: groupName,
          items: [],
          debtPriority: item.tag === 'LEARNING' ? 1 : 2,
        };
        permanentGroups.push(targetGroup);
      }
      
      if (!targetGroup.items.some((i) => i.bvid === item.bvid)) {
        targetGroup.items.push(metadata);
      }
      
      await chrome.storage.local.set({
        limboList: newLimboList,
        permanentGroups,
      });
      
      const tagText = item.tag === 'LEARNING' ? '学习' : '娱乐';
      alert(`已加入永久分组（${tagText}）`);
    }

    // Remove from selection
    const newSelected = new Set(selected);
    newSelected.delete(item.bvid);
    setSelected(newSelected);
  };

  return (
    <div>
      {/* Review Window Status Banner */}
      <div className={`mb-4 p-3 rounded-lg ${isInReviewWindow ? 'bg-green-900/50 border border-green-600' : 'bg-yellow-900/50 border border-yellow-600'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isInReviewWindow ? '✅' : '⏰'}</span>
            <span className={isInReviewWindow ? 'text-green-400 font-medium' : 'text-yellow-400 font-medium'}>
              {isInReviewWindow 
                ? `当前是审批时间 (${DEFAULT_CONFIG.windowStart} - ${DEFAULT_CONFIG.windowEnd})`
                : `当前非审批时间 - 审批时间: ${DEFAULT_CONFIG.windowStart} - ${DEFAULT_CONFIG.windowEnd}`
              }
            </span>
          </div>
          {!isInReviewWindow && (
            <span className="text-sm text-yellow-500">
              请在审批时间处理待审池
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">待审池 ({items.length})</h2>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
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
            <div key={item.bvid} className={`bg-gray-800 p-4 rounded-lg ${selected.has(item.bvid) ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex gap-4 items-start">
                <input
                  type="checkbox"
                  checked={selected.has(item.bvid)}
                  onChange={() => toggleSelection(item.bvid)}
                  className="w-5 h-5 mt-2 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <VideoCover url={item.coverUrl} title={item.title} />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{item.uploader}</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs ${item.tag === 'LEARNING' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                      {item.tag === 'LEARNING' ? '📚 学习' : '🎮 娱乐'}
                    </span>
                    <button
                      onClick={() => handleAction(item, 'permanent')}
                      disabled={!isInReviewWindow}
                      className={`px-3 py-1 rounded text-sm ${
                        isInReviewWindow 
                          ? 'bg-purple-600 hover:bg-purple-700' 
                          : 'bg-gray-600 cursor-not-allowed opacity-50'
                      }`}
                      title={isInReviewWindow ? '' : '请在审批时间处理'}
                    >
                      永久
                    </button>
                    <button
                      onClick={() => handleAction(item, 'cooling')}
                      disabled={!isInReviewWindow}
                      className={`px-3 py-1 rounded text-sm ${
                        isInReviewWindow 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-600 cursor-not-allowed opacity-50'
                      }`}
                      title={isInReviewWindow ? '' : '请在审批时间处理'}
                    >
                      冷静期
                    </button>
                    <button
                      onClick={() => handleAction(item, 'instant')}
                      disabled={!isInReviewWindow}
                      className={`px-3 py-1 rounded text-sm ${
                        isInReviewWindow 
                          ? 'bg-orange-600 hover:bg-orange-700' 
                          : 'bg-gray-600 cursor-not-allowed opacity-50'
                      }`}
                      title={isInReviewWindow ? '' : '请在审批时间处理'}
                    >
                      立即
                    </button>
                    <button
                      onClick={() => handleDelete(item.bvid)}
                      className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BatchToolbar
        selectedCount={selected.size}
        onSelectAll={selectAll}
        onDeleteSelected={handleBatchDelete}
        onClearSelection={clearSelection}
        totalCount={items.length}
      />
    </div>
  );
}

function CoolingList({ items }: { items: readonly CoolingItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const now = Date.now();

  const toggleSelection = (bvid: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(bvid)) {
      newSelected.delete(bvid);
    } else {
      newSelected.add(bvid);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(items.map((item) => item.bvid)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;
    
    const storage = await chrome.storage.local.get();
    const coolingList = (storage.coolingList || []) as CoolingItem[];
    const newCoolingList = coolingList.filter((item) => item.bvid !== bvid);
    await chrome.storage.local.set({ coolingList: newCoolingList });
    
    const newSelected = new Set(selected);
    newSelected.delete(bvid);
    setSelected(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;

    const storage = await chrome.storage.local.get();
    const coolingList = (storage.coolingList || []) as CoolingItem[];
    const newCoolingList = coolingList.filter((item) => !selected.has(item.bvid));
    await chrome.storage.local.set({ coolingList: newCoolingList });
    setSelected(new Set());
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空冷静期列表吗？')) return;
    await chrome.storage.local.set({ coolingList: [] });
    setSelected(new Set());
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">冷静期 ({items.length})</h2>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
          >
            清空列表
          </button>
        )}
      </div>
      
      {items.length === 0 ? (
        <p className="text-gray-500">没有处于冷静期的视频</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const isAvailable = now >= item.availableAt;
            const isExpired = now >= item.expiresAt;
            
            return (
              <ItemCard
                key={item.bvid}
                item={item}
                selected={selected.has(item.bvid)}
                onSelect={() => toggleSelection(item.bvid)}
                onDelete={() => handleDelete(item.bvid)}
              >
                <p className={`text-sm mt-2 ${isExpired ? 'text-red-400' : isAvailable ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isExpired
                    ? '已过期'
                    : isAvailable
                    ? '可观看'
                    : `还需等待 ${Math.ceil((item.availableAt - now) / 3600000)} 小时`}
                </p>
              </ItemCard>
            );
          })}
        </div>
      )}

      <BatchToolbar
        selectedCount={selected.size}
        onSelectAll={selectAll}
        onDeleteSelected={handleBatchDelete}
        onClearSelection={clearSelection}
        totalCount={items.length}
      />
    </div>
  );
}

function InstantList({ items }: { items: readonly InstantItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const now = Date.now();

  const toggleSelection = (bvid: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(bvid)) {
      newSelected.delete(bvid);
    } else {
      newSelected.add(bvid);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(items.map((item) => item.bvid)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;
    
    const storage = await chrome.storage.local.get();
    const instantList = (storage.instantList || []) as InstantItem[];
    const newInstantList = instantList.filter((item) => item.bvid !== bvid);
    await chrome.storage.local.set({ instantList: newInstantList });
    
    const newSelected = new Set(selected);
    newSelected.delete(bvid);
    setSelected(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;

    const storage = await chrome.storage.local.get();
    const instantList = (storage.instantList || []) as InstantItem[];
    const newInstantList = instantList.filter((item) => !selected.has(item.bvid));
    await chrome.storage.local.set({ instantList: newInstantList });
    setSelected(new Set());
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空即时许可列表吗？')) return;
    await chrome.storage.local.set({ instantList: [] });
    setSelected(new Set());
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">即时许可 ({items.length})</h2>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
          >
            清空列表
          </button>
        )}
      </div>
      
      {items.length === 0 ? (
        <p className="text-gray-500">没有即时许可</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const isExpired = now >= item.expiresAt;
            const hoursLeft = Math.ceil((item.expiresAt - now) / 3600000);
            
            return (
              <ItemCard
                key={item.bvid}
                item={item}
                selected={selected.has(item.bvid)}
                onSelect={() => toggleSelection(item.bvid)}
                onDelete={() => handleDelete(item.bvid)}
              >
                <p className={`text-sm mt-2 ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                  {isExpired ? '已过期' : `剩余 ${hoursLeft} 小时`}
                </p>
              </ItemCard>
            );
          })}
        </div>
      )}

      <BatchToolbar
        selectedCount={selected.size}
        onSelectAll={selectAll}
        onDeleteSelected={handleBatchDelete}
        onClearSelection={clearSelection}
        totalCount={items.length}
      />
    </div>
  );
}

function PermanentGroups({ groups }: { groups: readonly PermanentGroup[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  // Flatten all items from all groups and separate by tag
  const allItems = groups.flatMap(group => group.items);
  const learningItems = allItems.filter(item => item.tag === 'LEARNING');
  const entertainmentItems = allItems.filter(item => item.tag === 'ENTERTAINMENT');
  const totalItems = allItems.length;

  const toggleSelection = (bvid: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(bvid)) {
      newSelected.delete(bvid);
    } else {
      newSelected.add(bvid);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(allItems.map((item) => item.bvid)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleDeleteItem = async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;
    
    const storage = await chrome.storage.local.get();
    const permanentGroups = (storage.permanentGroups || []) as PermanentGroup[];
    
    // Remove item from whichever group it belongs to
    const updatedGroups = permanentGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.bvid !== bvid),
    }));
    
    await chrome.storage.local.set({ permanentGroups: updatedGroups });
    
    const newSelected = new Set(selected);
    newSelected.delete(bvid);
    setSelected(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 个视频吗？`)) return;

    const storage = await chrome.storage.local.get();
    const permanentGroups = (storage.permanentGroups || []) as PermanentGroup[];
    
    const updatedGroups = permanentGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !selected.has(item.bvid)),
    }));
    
    await chrome.storage.local.set({ permanentGroups: updatedGroups });
    setSelected(new Set());
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有永久分组吗？')) return;
    await chrome.storage.local.set({ permanentGroups: [] });
    setSelected(new Set());
  };

  const renderItemCard = (item: VideoMetadata) => (
    <div
      key={item.bvid}
      className={`flex gap-3 items-center bg-gray-700 p-3 rounded ${selected.has(item.bvid) ? 'ring-2 ring-blue-500' : ''}`}
    >
      <input
        type="checkbox"
        checked={selected.has(item.bvid)}
        onChange={() => toggleSelection(item.bvid)}
        className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
      />
      <VideoCover url={item.coverUrl} title={item.title} small />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.title}</p>
        <p className="text-xs text-gray-400">{item.uploader}</p>
      </div>
      <button
        onClick={() => handleDeleteItem(item.bvid)}
        className="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700 flex-shrink-0"
      >
        删除
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">永久分组 ({totalItems} 个视频)</h2>
        {totalItems > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
          >
            清空所有
          </button>
        )}
      </div>
      
      {totalItems === 0 ? (
        <p className="text-gray-500">没有永久分组视频</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Column */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📚</span>
              <h3 className="text-lg font-medium text-green-400">学习 ({learningItems.length})</h3>
            </div>
            <div className="grid gap-3">
              {learningItems.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无学习类视频</p>
              ) : (
                learningItems.map(renderItemCard)
              )}
            </div>
          </div>

          {/* Entertainment Column */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎮</span>
              <h3 className="text-lg font-medium text-yellow-400">娱乐 ({entertainmentItems.length})</h3>
            </div>
            <div className="grid gap-3">
              {entertainmentItems.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无娱乐类视频</p>
              ) : (
                entertainmentItems.map(renderItemCard)
              )}
            </div>
          </div>
        </div>
      )}

      <BatchToolbar
        selectedCount={selected.size}
        onSelectAll={selectAll}
        onDeleteSelected={handleBatchDelete}
        onClearSelection={clearSelection}
        totalCount={totalItems}
      />
    </div>
  );
}

function GhostList({ items }: { items: readonly GhostItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelection = (bvid: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(bvid)) {
      newSelected.delete(bvid);
    } else {
      newSelected.add(bvid);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    setSelected(new Set(items.map((item) => item.bvid)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleDelete = async (bvid: string) => {
    if (!confirm('确定要彻底删除这个视频吗？（无法恢复）')) return;
    
    const storage = await chrome.storage.local.get();
    const ghostList = (storage.ghostList || []) as GhostItem[];
    const newGhostList = ghostList.filter((item) => item.bvid !== bvid);
    await chrome.storage.local.set({ ghostList: newGhostList });
    
    const newSelected = new Set(selected);
    newSelected.delete(bvid);
    setSelected(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要彻底删除选中的 ${selected.size} 个视频吗？（无法恢复）`)) return;

    const storage = await chrome.storage.local.get();
    const ghostList = (storage.ghostList || []) as GhostItem[];
    const newGhostList = ghostList.filter((item) => !selected.has(item.bvid));
    await chrome.storage.local.set({ ghostList: newGhostList });
    setSelected(new Set());
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空幽灵档案吗？（无法恢复）')) return;
    await chrome.storage.local.set({ ghostList: [] });
    setSelected(new Set());
  };

  const now = Date.now();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">幽灵档案 ({items.length})</h2>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
          >
            清空档案
          </button>
        )}
      </div>
      
      {items.length === 0 ? (
        <p className="text-gray-500">没有幽灵档案</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const daysLeft = Math.ceil((item.canResurrectUntil - now) / (24 * 3600000));
            
            return (
              <ItemCard
                key={item.bvid}
                item={item}
                selected={selected.has(item.bvid)}
                onSelect={() => toggleSelection(item.bvid)}
                onDelete={() => handleDelete(item.bvid)}
              >
                <p className="text-sm mt-2 text-gray-400">
                  {daysLeft > 0 ? `还可招魂 ${daysLeft} 天` : '已彻底消失'}
                </p>
              </ItemCard>
            );
          })}
        </div>
      )}

      <BatchToolbar
        selectedCount={selected.size}
        onSelectAll={selectAll}
        onDeleteSelected={handleBatchDelete}
        onClearSelection={clearSelection}
        totalCount={items.length}
      />
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
