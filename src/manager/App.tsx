import { DEFAULT_CONFIG, DEFAULT_BEHAVIOR_LOG } from '@core/constants';
import { ConfigService, ExpirationService, GhostResurrectionService } from '@core/services';
import type { CoolingItem, ExtensionConfig, GhostItem, InstantItem, LimboItem, PermanentGroup, VideoMetadata } from '@core/types';
import { useStorage } from '@hooks/useStorage';
import { useEffect, useState } from 'react';

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
  const [activeTab, setActiveTab] = useState<'limbo' | 'cooling' | 'instant' | 'permanent' | 'ghost' | 'debt' | 'uploaders' | 'config'>('limbo');
  const storage = useStorage();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bilibili Focus Mode</h1>
        <p className="text-gray-400">意图性娱乐时间管理工具</p>
      </header>

      <nav className="flex gap-4 mb-6 border-b border-gray-700 pb-4 flex-wrap">
        {[
          { id: 'limbo', label: '待审池', count: storage.limboList?.length || 0 },
          { id: 'cooling', label: '冷静期', count: storage.coolingList?.length || 0 },
          { id: 'instant', label: '即时许可', count: storage.instantList?.length || 0 },
          { id: 'permanent', label: '永久分组', count: storage.permanentGroups?.length || 0 },
          { id: 'ghost', label: '幽灵档案', count: storage.ghostList?.length || 0 },
          { id: 'debt', label: '债务', count: null },
          { id: 'uploaders', label: 'UP主白名单', count: storage.allowedUploaders?.length || 0 },
          { id: 'config', label: '配置', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id
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
        {activeTab === 'limbo' && <LimboReview items={storage.limboList || []} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'cooling' && <CoolingList items={storage.coolingList || []} />}
        {activeTab === 'instant' && <InstantList items={storage.instantList || []} />}
        {activeTab === 'permanent' && <PermanentGroups groups={storage.permanentGroups || []} />}
        {activeTab === 'ghost' && <GhostList items={storage.ghostList || []} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'debt' && <DebtDashboard account={storage.debtAccount} config={storage.config || DEFAULT_CONFIG} />}
        {activeTab === 'uploaders' && <UploaderAllowlist uploaders={storage.allowedUploaders || []} />}
        {activeTab === 'config' && <ConfigPanel />}
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

function LimboReview({ items, config }: { items: readonly LimboItem[]; config: ExtensionConfig }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Check if currently in review window
  const now = new Date();
  const [windowStartHour, windowStartMinute] = config.windowStart.split(':').map(Number);
  const [windowEndHour, windowEndMinute] = config.windowEnd.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = windowStartHour * 60 + windowStartMinute;
  const endMinutes = windowEndHour * 60 + windowEndMinute;

  let isInReviewWindow: boolean;
  if (!config.timeWindowEnabled) {
    isInReviewWindow = true;
  } else if (endMinutes >= startMinutes) {
    isInReviewWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    isInReviewWindow = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const normalizeBehaviorLog = (raw: unknown) => ({
    ...DEFAULT_BEHAVIOR_LOG,
    ...(raw as typeof DEFAULT_BEHAVIOR_LOG | undefined),
  });

  const resetQuotaIfNeeded = (behaviorLog: typeof DEFAULT_BEHAVIOR_LOG) => {
    const today = getTodayKey();
    if (behaviorLog.lastQuotaResetDate === today) return behaviorLog;
    return {
      ...behaviorLog,
      lastQuotaResetDate: today,
      instantApplicationsToday: 0,
      coolingApplicationsToday: 0,
    };
  };

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
      alert('当前不在审批时间窗口，无法处理待审池视频\n请在 ' + config.windowStart + ' - ' + config.windowEnd + ' 期间进行审批');
      return;
    }

    const storage = await chrome.storage.local.get();
    const behaviorLog = resetQuotaIfNeeded(normalizeBehaviorLog(storage.behaviorLog));
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
      if (config.dailyCoolingQuota > 0 && behaviorLog.coolingApplicationsToday >= config.dailyCoolingQuota) {
        alert('已达到今日冷却配额，请明天再试');
        return;
      }

      const expirationService = new ExpirationService(
        config.coolingCooldownHours,
        config.coolingAvailableHours,
        config.instantDurationHours,
        config.ghostLifespanDays
      );
      const coolingItem = expirationService.createCoolingItem(metadata);
      const coolingList = (storage.coolingList || []) as CoolingItem[];
      const updatedBehaviorLog = {
        ...behaviorLog,
        coolingApplicationsToday: behaviorLog.coolingApplicationsToday + 1,
      };
      await chrome.storage.local.set({
        limboList: newLimboList,
        coolingList: [...coolingList, coolingItem],
        behaviorLog: updatedBehaviorLog,
      });
      alert(`已加入冷静期，将在 ${config.coolingCooldownHours} 小时后可用`);
    } else if (action === 'instant') {
      if (config.dailyInstantQuota > 0 && behaviorLog.instantApplicationsToday >= config.dailyInstantQuota) {
        alert('已达到今日即时配额，请明天再试');
        return;
      }

      const expirationService = new ExpirationService(
        config.coolingCooldownHours,
        config.coolingAvailableHours,
        config.instantDurationHours,
        config.ghostLifespanDays
      );
      const instantItem = expirationService.createInstantItem(metadata, ''); // Empty fuse code for now
      const instantList = (storage.instantList || []) as InstantItem[];
      const updatedBehaviorLog = {
        ...behaviorLog,
        instantApplicationsToday: behaviorLog.instantApplicationsToday + 1,
        lastInstantApplication: Date.now(),
      };
      await chrome.storage.local.set({
        limboList: newLimboList,
        instantList: [...instantList, instantItem],
        behaviorLog: updatedBehaviorLog,
      });
      alert(`已加入即时许可，有效期 ${config.instantDurationHours} 小时`);
    } else {
      const permanentGroups = (storage.permanentGroups || []) as PermanentGroup[];

      const totalPermanentItems = permanentGroups.reduce((sum, group) => sum + group.items.length, 0);
      if (totalPermanentItems >= config.totalPermanentLimit) {
        alert('已达到永久分组总限制');
        return;
      }

      // Find or create group based on tag
      const groupName = item.tag === 'LEARNING' ? '学习' : '娱乐';
      const groupId = item.tag === 'LEARNING' ? 'learning' : 'entertainment';

      let targetGroup = permanentGroups.find(g => g.id === groupId);
      if (!targetGroup) {
        if (permanentGroups.length >= config.maxGroups) {
          alert('已达到最大分组数');
          return;
        }
        targetGroup = {
          id: groupId,
          name: groupName,
          items: [],
          debtPriority: item.tag === 'LEARNING' ? 1 : 2,
        };
        permanentGroups.push(targetGroup);
      }

      if (targetGroup.items.length >= config.maxItemsPerGroup) {
        alert('该分组已达到最大项目数');
        return;
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
              {!config.timeWindowEnabled
                ? '时间窗口已关闭，随时可审批'
                : isInReviewWindow
                  ? `当前是审批时间 (${config.windowStart} - ${config.windowEnd})`
                  : `当前非审批时间 - 审批时间: ${config.windowStart} - ${config.windowEnd}`}
            </span>
          </div>
          {!config.timeWindowEnabled || isInReviewWindow ? null : (
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
                      className={`px-3 py-1 rounded text-sm ${isInReviewWindow
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
                      className={`px-3 py-1 rounded text-sm ${isInReviewWindow
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
                      className={`px-3 py-1 rounded text-sm ${isInReviewWindow
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

function GhostList({ items, config }: { items: readonly GhostItem[]; config: ExtensionConfig }) {
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

  const handleResurrect = async (item: GhostItem) => {
    const repentanceReason = prompt('请输入忏悔理由（至少 10 字）');
    if (!repentanceReason) return;

    const fuseCodeInput = prompt('请输入招魂熔断码');
    if (!fuseCodeInput) return;

    const service = new GhostResurrectionService(config);
    const result = await service.resurrect(item, fuseCodeInput, repentanceReason);
    if (!result.success) {
      alert(result.message);
      return;
    }

    alert(result.message);
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
                {daysLeft > 0 && (
                  <button
                    onClick={() => handleResurrect(item)}
                    className="mt-2 px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700"
                  >
                    招魂
                  </button>
                )}
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

function DebtDashboard({
  account,
  config,
}: {
  account?: { currentDebt: number; totalEntertainmentMinutes?: number; totalLearningMinutes?: number };
  config: ExtensionConfig;
}) {
  const debt = account?.currentDebt || 0;
  const entertainmentMinutes = account?.totalEntertainmentMinutes || 0;
  const learningMinutes = account?.totalLearningMinutes || 0;
  const isBankrupt = debt >= config.maxDebtMinutes;

  // Calculate net debt composition
  const entertainmentDebt = entertainmentMinutes * config.entertainmentRatio;
  const learningRepaid = learningMinutes * config.learningRepayRatio;
  const learningRepaidAbs = Math.abs(learningRepaid);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">债务仪表盘</h2>

      {/* Main Debt Display */}
      <div className={`p-6 rounded-lg mb-4 ${isBankrupt ? 'bg-red-900/50' : 'bg-gray-800'}`}>
        <div className="text-4xl font-bold mb-2">
          {debt.toFixed(1)} 分钟
        </div>
        <p className="text-gray-400">
          {isBankrupt
            ? `⚠️ 已破产！${config.bankruptcyLockHours}小时内禁止新申请`
            : debt > config.maxDebtMinutes * 0.5
              ? '债务较高，建议观看学习类视频偿还'
              : '债务状况良好'}
        </p>
      </div>

      {/* Watch Time Statistics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Entertainment Stats */}
        <div className="bg-yellow-900/30 border border-yellow-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎮</span>
            <h3 className="font-medium text-yellow-400">娱乐时长</h3>
          </div>
          <div className="text-2xl font-bold text-yellow-300">
            {entertainmentMinutes.toFixed(1)} 分钟
          </div>
          <p className="text-sm text-yellow-500/70 mt-1">
            产生债务: +{entertainmentDebt.toFixed(1)} 分钟
          </p>
        </div>

        {/* Learning Stats */}
        <div className="bg-green-900/30 border border-green-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📚</span>
            <h3 className="font-medium text-green-400">学习时长</h3>
          </div>
          <div className="text-2xl font-bold text-green-300">
            {learningMinutes.toFixed(1)} 分钟
          </div>
          <p className="text-sm text-green-500/70 mt-1">
            偿还债务: -{learningRepaidAbs.toFixed(1)} 分钟
          </p>
        </div>
      </div>

      {/* Net Debt Calculation */}
      <div className="mt-4 bg-gray-800 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-400 mb-2">债务计算</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-yellow-500">娱乐债务:</span>
            <span className="text-yellow-400">+{entertainmentDebt.toFixed(1)} 分钟</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-500">学习偿还:</span>
            <span className="text-green-400">-{learningRepaidAbs.toFixed(1)} 分钟</span>
          </div>
          <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between font-medium">
            <span className="text-white">净债务:</span>
            <span className={debt > 0 ? 'text-red-400' : 'text-green-400'}>
              {debt.toFixed(1)} 分钟
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Uploader Allowlist Component
function UploaderAllowlist({ uploaders }: { uploaders: { id: string; name: string; tag: 'LEARNING' | 'ENTERTAINMENT'; addedAt: number }[] }) {
  const [newUploaderName, setNewUploaderName] = useState('');
  const [selectedTag, setSelectedTag] = useState<'LEARNING' | 'ENTERTAINMENT'>('LEARNING');

  const handleAdd = async () => {
    if (!newUploaderName.trim()) return;

    const storage = await chrome.storage.local.get();
    const currentUploaders = storage.allowedUploaders || [];

    // Check if already exists
    if (currentUploaders.some((u: { name: string }) => u.name === newUploaderName.trim())) {
      alert('该UP主已在白名单中');
      return;
    }

    const newUploader = {
      id: `uploader_${Date.now()}`,
      name: newUploaderName.trim(),
      tag: selectedTag,
      addedAt: Date.now(),
    };

    await chrome.storage.local.set({
      allowedUploaders: [...currentUploaders, newUploader],
    });

    setNewUploaderName('');
    alert('添加成功！');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要移除这个UP主吗？')) return;

    const storage = await chrome.storage.local.get();
    const currentUploaders = storage.allowedUploaders || [];

    await chrome.storage.local.set({
      allowedUploaders: currentUploaders.filter((u: { id: string }) => u.id !== id),
    });
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有UP主吗？')) return;
    await chrome.storage.local.set({ allowedUploaders: [] });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">UP主白名单</h2>
        {uploaders.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
          >
            清空所有
          </button>
        )}
      </div>

      {/* Add new uploader */}
      <div className="bg-gray-800 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-medium mb-3">添加UP主</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={newUploaderName}
            onChange={(e) => setNewUploaderName(e.target.value)}
            placeholder="输入UP主名称"
            className="flex-1 min-w-[200px] px-3 py-2 bg-gray-700 rounded"
          />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value as 'LEARNING' | 'ENTERTAINMENT')}
            className="px-3 py-2 bg-gray-700 rounded"
          >
            <option value="LEARNING">📚 学习</option>
            <option value="ENTERTAINMENT">🎮 娱乐</option>
          </select>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            添加
          </button>
        </div>
      </div>

      {/* Uploader list */}
      {uploaders.length === 0 ? (
        <p className="text-gray-500">暂无UP主白名单</p>
      ) : (
        <div className="grid gap-3">
          {uploaders.map((uploader) => (
            <div
              key={uploader.id}
              className="bg-gray-800 p-4 rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="font-medium">{uploader.name}</p>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${uploader.tag === 'LEARNING'
                      ? 'bg-green-600'
                      : 'bg-yellow-600'
                      }`}
                  >
                    {uploader.tag === 'LEARNING' ? '学习' : '娱乐'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(uploader.id)}
                className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Configuration Panel Component
function ConfigPanel() {
  const [config, setConfig] = useState<ExtensionConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const configService = new ConfigService();

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      const loaded = await configService.loadConfig();
      setConfig(loaded);
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    const result = await configService.saveConfig(config);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert('保存失败: ' + result.errors?.map(e => e.message).join(', '));
    }
  };

  const handleReset = async () => {
    if (confirm('确定要重置为默认配置吗？')) {
      await configService.resetToDefaults();
      const defaultConfig = await configService.loadConfig();
      setConfig(defaultConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const descriptions = configService.getConfigDescriptions();

  const updateConfig = (field: keyof ExtensionConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">配置</h2>
        <div className="flex gap-2">
          {saved && (
            <span className="px-3 py-1 bg-green-600 rounded text-sm">
              ✓ 已保存
            </span>
          )}
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-gray-600 rounded text-sm hover:bg-gray-700"
          >
            重置默认
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
          >
            保存配置
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Time Window Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">⏰ 时间窗口</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.timeWindowEnabled}
                onChange={(e) => updateConfig('timeWindowEnabled', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>{descriptions.timeWindowEnabled.label}</span>
            </label>

            {config.timeWindowEnabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.windowStart.label}
                  </label>
                  <input
                    type="time"
                    value={config.windowStart}
                    onChange={(e) => updateConfig('windowStart', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.windowEnd.label}
                  </label>
                  <input
                    type="time"
                    value={config.windowEnd}
                    onChange={(e) => updateConfig('windowEnd', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Limbo Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">🗃️ 待审池</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.limboCapacity.label}
              </label>
              <input
                type="number"
                value={config.limboCapacity}
                onChange={(e) => updateConfig('limboCapacity', parseInt(e.target.value))}
                min={1}
                max={20}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.limboReviewTime.label}
              </label>
              <input
                type="time"
                value={config.limboReviewTime}
                onChange={(e) => updateConfig('limboReviewTime', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.limboAutoPurgeHours.label}
              </label>
              <input
                type="number"
                value={config.limboAutoPurgeHours}
                onChange={(e) => updateConfig('limboAutoPurgeHours', parseInt(e.target.value))}
                min={0}
                max={168}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">0 表示关闭自动清理</p>
            </div>
          </div>
        </div>

        {/* Instant Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">⚡ 即时许可</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.instantDurationHours.label}
              </label>
              <input
                type="number"
                value={config.instantDurationHours}
                onChange={(e) => updateConfig('instantDurationHours', parseInt(e.target.value))}
                min={1}
                max={24}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.instantBreakFuse}
                  onChange={(e) => updateConfig('instantBreakFuse', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{descriptions.instantBreakFuse.label}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Cooling Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">❄️ 冷静期</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.coolingCooldownHours.label}
              </label>
              <input
                type="number"
                value={config.coolingCooldownHours}
                onChange={(e) => updateConfig('coolingCooldownHours', parseInt(e.target.value))}
                min={1}
                max={168}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">{descriptions.coolingCooldownHours.description}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.coolingAvailableHours.label}
              </label>
              <input
                type="number"
                value={config.coolingAvailableHours}
                onChange={(e) => updateConfig('coolingAvailableHours', parseInt(e.target.value))}
                min={1}
                max={168}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">{descriptions.coolingAvailableHours.description}</p>
            </div>
          </div>
        </div>

        {/* Fuse Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">🔐 熔断码</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.baseFuseLength.label}
              </label>
              <input
                type="number"
                value={config.baseFuseLength}
                onChange={(e) => updateConfig('baseFuseLength', parseInt(e.target.value))}
                min={4}
                max={16}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.maxFuseLength.label}
              </label>
              <input
                type="number"
                value={config.maxFuseLength}
                onChange={(e) => updateConfig('maxFuseLength', parseInt(e.target.value))}
                min={config.baseFuseLength}
                max={128}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.bankruptcyOverrideMaxFuse.label}
              </label>
              <input
                type="number"
                value={config.bankruptcyOverrideMaxFuse}
                onChange={(e) => updateConfig('bankruptcyOverrideMaxFuse', parseInt(e.target.value))}
                min={config.baseFuseLength}
                max={128}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              checked={config.dynamicFuseEnabled}
              onChange={(e) => updateConfig('dynamicFuseEnabled', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{descriptions.dynamicFuseEnabled.label}</span>
          </label>
        </div>

        {/* Permanent Group Limits */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">📌 永久分组</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.maxGroups.label}
              </label>
              <input
                type="number"
                value={config.maxGroups}
                onChange={(e) => updateConfig('maxGroups', parseInt(e.target.value))}
                min={1}
                max={10}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.maxItemsPerGroup.label}
              </label>
              <input
                type="number"
                value={config.maxItemsPerGroup}
                onChange={(e) => updateConfig('maxItemsPerGroup', parseInt(e.target.value))}
                min={1}
                max={50}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.totalPermanentLimit.label}
              </label>
              <input
                type="number"
                value={config.totalPermanentLimit}
                onChange={(e) => updateConfig('totalPermanentLimit', parseInt(e.target.value))}
                min={1}
                max={200}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>
        </div>

        {/* Debt Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">💰 债务系统</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.debtEnabled}
                onChange={(e) => updateConfig('debtEnabled', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>{descriptions.debtEnabled.label}</span>
            </label>

            {config.debtEnabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.entertainmentRatio.label}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.entertainmentRatio}
                    onChange={(e) => updateConfig('entertainmentRatio', parseFloat(e.target.value))}
                    min={0.5}
                    max={5}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.learningRepayRatio.label}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.learningRepayRatio}
                    onChange={(e) => updateConfig('learningRepayRatio', parseFloat(e.target.value))}
                    min={-5}
                    max={-0.5}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.maxDebtMinutes.label}
                  </label>
                  <input
                    type="number"
                    value={config.maxDebtMinutes}
                    onChange={(e) => updateConfig('maxDebtMinutes', parseInt(e.target.value))}
                    min={10}
                    max={300}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.bankruptcyLockHours.label}
                  </label>
                  <input
                    type="number"
                    value={config.bankruptcyLockHours}
                    onChange={(e) => updateConfig('bankruptcyLockHours', parseInt(e.target.value))}
                    min={1}
                    max={168}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {descriptions.postWatchCooldownMinutes.label}
                  </label>
                  <input
                    type="number"
                    value={config.postWatchCooldownMinutes}
                    onChange={(e) => updateConfig('postWatchCooldownMinutes', parseInt(e.target.value))}
                    min={0}
                    max={120}
                    className="w-full px-3 py-2 bg-gray-700 rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ghost Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">👻 幽灵档案</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.ghostLifespanDays.label}
              </label>
              <input
                type="number"
                value={config.ghostLifespanDays}
                onChange={(e) => updateConfig('ghostLifespanDays', parseInt(e.target.value))}
                min={1}
                max={30}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.ghostResurrectFuseLength.label}
              </label>
              <input
                type="number"
                value={config.ghostResurrectFuseLength}
                onChange={(e) => updateConfig('ghostResurrectFuseLength', parseInt(e.target.value))}
                min={4}
                max={128}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.ghostDoublePenalty}
                  onChange={(e) => updateConfig('ghostDoublePenalty', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{descriptions.ghostDoublePenalty.label}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Quota Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">📊 配额</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.dailyCoolingQuota.label}
              </label>
              <input
                type="number"
                value={config.dailyCoolingQuota}
                onChange={(e) => updateConfig('dailyCoolingQuota', parseInt(e.target.value))}
                min={0}
                max={100}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {descriptions.dailyInstantQuota.label}
              </label>
              <input
                type="number"
                value={config.dailyInstantQuota}
                onChange={(e) => updateConfig('dailyInstantQuota', parseInt(e.target.value))}
                min={0}
                max={100}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
          </div>
        </div>

        {/* Detection Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">🔍 识别</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.collectionDetectionEnabled}
              onChange={(e) => updateConfig('collectionDetectionEnabled', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{descriptions.collectionDetectionEnabled.label}</span>
          </label>
        </div>

        {/* Style Simplification Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3">🎨 样式简化</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.videoPlayerSimplification.enabled}
                onChange={(e) => updateConfig('videoPlayerSimplification', {
                  ...config.videoPlayerSimplification,
                  enabled: e.target.checked
                })}
                className="w-4 h-4 rounded"
              />
              <span>启用视频播放页样式简化</span>
            </label>

            {config.videoPlayerSimplification.enabled && (
              <div className="ml-6 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.hideComments}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideComments: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏评论区</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.hideRecommendations}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideRecommendations: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏推荐视频</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.hideDanmaku}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideDanmaku: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏弹幕</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.hideSidebar}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideSidebar: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏侧边栏</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.hideAds}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      hideAds: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">隐藏广告</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.videoPlayerSimplification.minimalPlayer}
                    onChange={(e) => updateConfig('videoPlayerSimplification', {
                      ...config.videoPlayerSimplification,
                      minimalPlayer: e.target.checked
                    })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">极简播放器模式（保留控制栏）</span>
                </label>
              </div>
            )}

            <div className="border-t border-gray-700 pt-3 mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.homepageSimplification.enabled}
                  onChange={(e) => updateConfig('homepageSimplification', {
                    ...config.homepageSimplification,
                    enabled: e.target.checked
                  })}
                  className="w-4 h-4 rounded"
                />
                <span>启用首页样式简化</span>
              </label>

              {config.homepageSimplification.enabled && (
                <div className="ml-6 space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.hideRecommendations}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        hideRecommendations: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏推荐视频</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.hideTrending}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        hideTrending: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏热门榜单</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.hideAds}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        hideAds: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏广告</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.hideLiveStreams}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        hideLiveStreams: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏直播</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.compactLayout}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        compactLayout: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">紧凑布局</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.homepageSimplification.redirectToSearch}
                      onChange={(e) => updateConfig('homepageSimplification', {
                        ...config.homepageSimplification,
                        redirectToSearch: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">重定向到搜索页（默认开启）</span>
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 pt-3 mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.dynamicSimplification.enabled}
                  onChange={(e) => updateConfig('dynamicSimplification', {
                    ...config.dynamicSimplification,
                    enabled: e.target.checked
                  })}
                  className="w-4 h-4 rounded"
                />
                <span>启用动态页样式简化</span>
              </label>

              {config.dynamicSimplification.enabled && (
                <div className="ml-6 space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dynamicSimplification.hideRecommendations}
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        hideRecommendations: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏推荐内容</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dynamicSimplification.hideLiveStreams}
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        hideLiveStreams: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏直播入口</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dynamicSimplification.showOnlyFollowing}
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        showOnlyFollowing: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">仅显示关注内容</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dynamicSimplification.hideAds}
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        hideAds: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏广告</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dynamicSimplification.compactLayout}
                      onChange={(e) => updateConfig('dynamicSimplification', {
                        ...config.dynamicSimplification,
                        compactLayout: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">紧凑布局</span>
                  </label>
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 pt-3 mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.liveSimplification.enabled}
                  onChange={(e) => updateConfig('liveSimplification', {
                    ...config.liveSimplification,
                    enabled: e.target.checked
                  })}
                  className="w-4 h-4 rounded"
                />
                <span>启用直播页样式简化</span>
              </label>

              {config.liveSimplification.enabled && (
                <div className="ml-6 space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.liveSimplification.hideComments}
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        hideComments: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏评论区</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.liveSimplification.hideGiftEffects}
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        hideGiftEffects: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏礼物特效</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.liveSimplification.hideAds}
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        hideAds: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏广告</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.liveSimplification.hideSidebar}
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        hideSidebar: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">隐藏侧边栏</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.liveSimplification.minimalPlayer}
                      onChange={(e) => updateConfig('liveSimplification', {
                        ...config.liveSimplification,
                        minimalPlayer: e.target.checked
                      })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">极简播放器模式</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
