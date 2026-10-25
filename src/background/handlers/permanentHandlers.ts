import type { ProtocolMap } from '@core/protocol';
import type { PermanentGroup, VideoTag } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';
import { logger } from '@core/utils/logger';
import { assertMessageType, ensureStorageDefaults } from './utils';

const GROUP_META: Record<VideoTag, Pick<PermanentGroup, 'id' | 'name' | 'debtPriority'>> = {
  LEARNING: { id: 'learning', name: '学习', debtPriority: 1 },
  ENTERTAINMENT: { id: 'entertainment', name: '娱乐', debtPriority: 2 },
  MUSIC: { id: 'music', name: '音乐', debtPriority: 3 },
};

export async function handleAddToPermanent(request: unknown): Promise<ProtocolMap['add-to-permanent']['res']> {
  const data = assertMessageType<ProtocolMap['add-to-permanent']['req']>(request);
  const storage = ensureStorageDefaults(await chrome.storage.local.get());
  const groups = storage.permanentGroups.map((group) => ({
    ...group,
    items: [...group.items],
  }));

  if (groups.some((group) => group.items.some((item) => item.bvid === data.metadata.bvid))) {
    return {
      success: true,
      permanentCount: groups.reduce((count, group) => count + group.items.length, 0),
      message: '视频已经在永久放行列表中',
    };
  }

  const totalItems = groups.reduce((count, group) => count + group.items.length, 0);
  if (totalItems >= storage.config.totalPermanentLimit) {
    return {
      success: false,
      permanentCount: totalItems,
      message: '已达到永久放行总限制',
    };
  }

  const meta = GROUP_META[data.metadata.tag];
  let targetGroup = groups.find((group) => group.id === meta.id);
  if (!targetGroup) {
    if (groups.length >= storage.config.maxGroups) {
      return {
        success: false,
        permanentCount: totalItems,
        message: '已达到永久分组限制',
      };
    }
    targetGroup = {
      ...meta,
      items: [],
    };
    groups.push(targetGroup);
  }

  if (targetGroup.items.length >= storage.config.maxItemsPerGroup) {
    return {
      success: false,
      permanentCount: totalItems,
      message: '该 Tag 分组已达到容量限制',
    };
  }

  targetGroup.items.push({ ...data.metadata });
  await StorageRepository.set({ permanentGroups: groups });

  const permanentCount = totalItems + 1;
  logger.debug('PermanentHandlers', 'Added permanent video:', data.metadata.bvid, data.metadata.tag);
  return {
    success: true,
    permanentCount,
    message: '已加入永久放行',
  };
}
