import { useState, useCallback } from 'react';

import { DEFAULT_BEHAVIOR_LOG } from '@core/constants';
import { ExpirationService } from '@core/services';
import type {
  BehaviorLogState,
  ExtensionConfig,
  LimboItem,
  VideoMetadata,
} from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';
import { getTodayKey, resetQuotaIfNeeded } from '@core/utils/dateUtils';
import { logger } from '@core/utils/logger';

function normalizeBehaviorLog(raw: unknown): BehaviorLogState {
  return {
    ...DEFAULT_BEHAVIOR_LOG,
    ...(raw as BehaviorLogState | undefined),
  };
}

function resetBehaviorLogQuotaIfNeeded(behaviorLog: BehaviorLogState): BehaviorLogState {
  if (!resetQuotaIfNeeded(behaviorLog.lastQuotaResetDate, getTodayKey())) return behaviorLog;
  return {
    ...behaviorLog,
    lastQuotaResetDate: getTodayKey(),
    instantApplicationsToday: 0,
    coolingApplicationsToday: 0,
  };
}

export function useLimboActions(config: ExtensionConfig) {
  const [processingBvid, setProcessingBvid] = useState<string | null>(null);

  const handleAction = useCallback(
    async (item: LimboItem, action: 'permanent' | 'cooling' | 'instant') => {
      setProcessingBvid(item.bvid);
      try {
        const storage = await StorageRepository.get();
        const behaviorLog = resetBehaviorLogQuotaIfNeeded(normalizeBehaviorLog(storage.behaviorLog));
        const limboList = storage.limboList;
        const newLimboList = limboList.filter((i) => i.bvid !== item.bvid);

        const metadata: VideoMetadata = {
          bvid: item.bvid,
          title: item.title,
          uploader: item.uploader,
          coverUrl: item.coverUrl,
          tag: item.tag,
          addedAt: Date.now(),
        };

        if (action === 'cooling') {
          if (config.dailyCoolingQuota > 0 && behaviorLog.coolingApplicationsToday >= config.dailyCoolingQuota) {
            alert('已达到今日冷却配额，请明天再试');
            return false;
          }

          const expirationService = new ExpirationService(
            config.coolingCooldownHours,
            config.coolingAvailableHours,
            config.instantDurationHours,
            config.ghostLifespanDays
          );
          const coolingItem = expirationService.createCoolingItem(metadata);
          const coolingList = storage.coolingList;
          const filteredCoolingList = coolingList.filter(i => i.bvid !== item.bvid);
          const updatedBehaviorLog = {
            ...behaviorLog,
            coolingApplicationsToday: behaviorLog.coolingApplicationsToday + 1,
          };
          await StorageRepository.set({
            limboList: newLimboList,
            coolingList: [...filteredCoolingList, coolingItem],
            behaviorLog: updatedBehaviorLog,
          });
          alert(`已加入冷静期，将在 ${config.coolingCooldownHours} 小时后可用`);
        } else if (action === 'instant') {
          if (config.dailyInstantQuota > 0 && behaviorLog.instantApplicationsToday >= config.dailyInstantQuota) {
            alert('已达到今日即时配额，请明天再试');
            return false;
          }

          const expirationService = new ExpirationService(
            config.coolingCooldownHours,
            config.coolingAvailableHours,
            config.instantDurationHours,
            config.ghostLifespanDays
          );
          const instantItem = expirationService.createInstantItem(metadata, '');
          const instantList = storage.instantList;
          const filteredInstantList = instantList.filter(i => i.bvid !== item.bvid);
          const updatedBehaviorLog = {
            ...behaviorLog,
            instantApplicationsToday: behaviorLog.instantApplicationsToday + 1,
            lastInstantApplication: Date.now(),
          };
          await StorageRepository.set({
            limboList: newLimboList,
            instantList: [...filteredInstantList, instantItem],
            behaviorLog: updatedBehaviorLog,
          });
          alert(`已加入即时许可，有效期 ${config.instantDurationHours} 小时`);
        } else {
          const permanentGroups = storage.permanentGroups;

          const existsInAnyGroup = permanentGroups.some(g =>
            g.items.some(i => i.bvid === item.bvid)
          );
          if (existsInAnyGroup) {
            alert('该视频已在其他永久分组中');
            return false;
          }

          const totalPermanentItems = permanentGroups.reduce((sum, group) => sum + group.items.length, 0);
          if (totalPermanentItems >= config.totalPermanentLimit) {
            alert('已达到永久分组总限制');
            return false;
          }

          const groupName = item.tag === 'LEARNING' ? '学习' : '娱乐';
          const groupId = item.tag === 'LEARNING' ? 'learning' : 'entertainment';

          let targetGroup = permanentGroups.find((g) => g.id === groupId);
          if (!targetGroup) {
            if (permanentGroups.length >= config.maxGroups) {
              alert('已达到最大分组数');
              return false;
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
            return false;
          }

          if (!targetGroup.items.some((i) => i.bvid === item.bvid)) {
            targetGroup.items.push(metadata);
          }

          await StorageRepository.set({
            limboList: newLimboList,
            permanentGroups,
          });

          const tagText = item.tag === 'LEARNING' ? '学习' : '娱乐';
          alert(`已加入永久分组（${tagText}）`);
        }

        logger.debug('LimboReview', `${action}:`, item.bvid);
        return true;
      } catch (error) {
        logger.error('LimboReview', `Failed to ${action}:`, error);
        return false;
      } finally {
        setProcessingBvid(null);
      }
    },
    [config]
  );

  const handleDelete = useCallback(async (bvid: string) => {
    if (!confirm('确定要删除这个视频吗？')) return false;

    try {
      const { limboList } = await StorageRepository.getKeys('limboList');
      const newLimboList = limboList.filter((item) => item.bvid !== bvid);
      await StorageRepository.set({ limboList: newLimboList });
      logger.debug('LimboReview', 'Deleted:', bvid);
      return true;
    } catch (error) {
      logger.error('LimboReview', 'Failed to delete:', error);
      return false;
    }
  }, []);

  const handleBatchDelete = useCallback(async (bvids: Set<string>) => {
    if (bvids.size === 0) return false;
    if (!confirm(`确定要删除选中的 ${bvids.size} 个视频吗？`)) return false;

    try {
      const { limboList } = await StorageRepository.getKeys('limboList');
      const newLimboList = limboList.filter((item) => !bvids.has(item.bvid));
      await StorageRepository.set({ limboList: newLimboList });
      logger.debug('LimboReview', 'Batch deleted:', bvids.size);
      return true;
    } catch (error) {
      logger.error('LimboReview', 'Failed to batch delete:', error);
      return false;
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    if (!confirm('确定要清空待审池吗？')) return false;

    try {
      await StorageRepository.set({ limboList: [] });
      logger.debug('LimboReview', 'Cleared all');
      return true;
    } catch (error) {
      logger.error('LimboReview', 'Failed to clear all:', error);
      return false;
    }
  }, []);

  return {
    processingBvid,
    handleAction,
    handleDelete,
    handleBatchDelete,
    handleClearAll,
  };
}
