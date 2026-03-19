import { useState } from 'react';

import { DEFAULT_BEHAVIOR_LOG } from '@core/constants';
import { ExpirationService } from '@core/services';
import type { CoolingItem, ExtensionConfig, InstantItem, LimboItem, PermanentGroup, VideoMetadata } from '@core/types';

import { TimeWindowFusePanel } from './TimeWindowFusePanel';
import { BatchToolbar, VideoCover } from './shared';

export function LimboReview({ items, config }: { items: readonly LimboItem[]; config: ExtensionConfig }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Check if currently in review window
  const now = new Date();
  const [windowStartHour, windowStartMinute] = config.windowStart.split(':').map(Number);
  const [windowEndHour, windowEndMinute] = config.windowEnd.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = windowStartHour * 60 + windowStartMinute;
  const endMinutes = windowEndHour * 60 + windowEndMinute;

  const calculateIsInReviewWindow = () => {
    if (!config.timeWindowEnabled) {
      return true;
    } else if (endMinutes >= startMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  };

  const [isInReviewWindow, setIsInReviewWindow] = useState(calculateIsInReviewWindow);

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
        <div className={`flex ${isInReviewWindow ? 'items-center justify-between' : 'flex-col gap-4'}`}>
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
            <div>
              <TimeWindowFusePanel onFuseApplied={() => setIsInReviewWindow(true)} />
            </div>
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
          {items.map((item) => {
            const videoUrl = item.bvid.startsWith('LIVE_')
              ? `https://live.bilibili.com/${item.bvid.replace('LIVE_', '')}`
              : `https://www.bilibili.com/video/${item.bvid}`;
            return (
              <div key={item.bvid} className={`bg-gray-800 p-4 rounded-lg ${selected.has(item.bvid) ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex gap-4 items-start">
                  <input
                    type="checkbox"
                    checked={selected.has(item.bvid)}
                    onChange={() => toggleSelection(item.bvid)}
                    className="w-5 h-5 mt-2 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <VideoCover url={item.coverUrl} title={item.title} />
                  </a>
                  <div className="flex-1">
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium mb-1 hover:text-blue-400 transition-colors block"
                    >
                      {item.title}
                    </a>
                    <p className="text-sm text-gray-400 mb-2">{item.uploader}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs ${item.tag === 'LEARNING' ? 'bg-green-600' : item.tag === 'MUSIC' ? 'bg-blue-600' : 'bg-yellow-600'}`}>
                        {item.tag === 'LEARNING' ? '📚 学习' : item.tag === 'MUSIC' ? '🎵 音乐' : '🎮 娱乐'}
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
