import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@core/utils/logger';
import type { ExtensionConfig, VideoTag } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';
import {
  Button,
  Card,
  EmptyState,
  SectionHeader,
  Toggle,
  confirmAction,
  toast,
} from '@ui';

interface KeywordItem {
  keyword: string;
  tag: VideoTag;
}

const TAG_OPTIONS: { value: VideoTag; label: string }[] = [
  { value: 'LEARNING', label: '学习' },
  { value: 'MUSIC', label: '音乐' },
];

export function KeywordRulesPanel({ config }: { config: ExtensionConfig }): React.JSX.Element {
  const [keywordItems, setKeywordItems] = useState<KeywordItem[]>(() => {
    if (config.keywordRules?.items && config.keywordRules.items.length > 0) {
      return config.keywordRules.items;
    }
    return config.keywordRules?.keywords?.map((keyword: string) => ({
      keyword,
      tag: config.keywordRules?.tag || 'LEARNING',
    })) || [];
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [newTag, setNewTag] = useState<VideoTag>('LEARNING');
  const [enabled, setEnabled] = useState(config.keywordRules?.enabled ?? true);

  const saveToStorage = useCallback(async (items: KeywordItem[], newEnabled: boolean) => {
    try {
      await StorageRepository.update('config', (current) => ({
        ...current,
        keywordRules: {
          enabled: newEnabled,
          keywords: items.map((item) => item.keyword),
          tag: 'LEARNING',
          items,
        },
      }));
    } catch (error) {
      logger.error('KeywordRulesPanel', 'Failed to save keyword rules:', error);
      toast.error('保存失败，请重试');
    }
  }, []);

  // Migrate legacy `keywords`-only data to the per-keyword `items` format once.
  useEffect(() => {
    const needsMigration =
      config.keywordRules?.keywords?.length > 0 &&
      (!config.keywordRules.items || config.keywordRules.items.length === 0);
    if (needsMigration && keywordItems.length > 0) {
      logger.info('KeywordRulesPanel', 'Migrating keyword rules to items format');
      void saveToStorage(keywordItems, enabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (keywordItems.some((item) => item.keyword === trimmed)) {
      toast.error('关键词已存在');
      return;
    }

    const newItems = [...keywordItems, { keyword: trimmed, tag: newTag }];
    setKeywordItems(newItems);
    setNewKeyword('');
    await saveToStorage(newItems, enabled);
    toast.success(`已添加关键词「${trimmed}」`);
  };

  const handleDelete = async (keyword: string) => {
    const ok = await confirmAction({
      title: '删除关键词',
      description: `删除后标题包含「${keyword}」的视频将不再自动放行。`,
      confirmLabel: '删除',
      danger: true,
    });
    if (!ok) return;

    const newItems = keywordItems.filter((item) => item.keyword !== keyword);
    setKeywordItems(newItems);
    await saveToStorage(newItems, enabled);
    toast.success('已删除');
  };

  const handleTagChange = async (keyword: string, newTagValue: VideoTag) => {
    const newItems = keywordItems.map((item) =>
      item.keyword === keyword ? { ...item, tag: newTagValue } : item
    );
    setKeywordItems(newItems);
    await saveToStorage(newItems, enabled);
  };

  const handleToggleEnabled = async (next: boolean) => {
    setEnabled(next);
    await saveToStorage(keywordItems, next);
    toast.info(next ? '关键词规则已启用' : '关键词规则已停用');
  };

  return (
    <div>
      <SectionHeader
        title="关键词自动放行"
        icon="tag"
        count={keywordItems.length}
        description="标题包含关键词的视频会自动放行，并按对应标签计入债务。"
        actions={
          <div className="flex items-center gap-2.5 rounded-full border border-secondary px-3 py-1.5">
            <span className="text-[12px] text-tertiary">{enabled ? '已启用' : '已停用'}</span>
            <Toggle checked={enabled} onChange={handleToggleEnabled} label="启用关键词规则" />
          </div>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="输入关键词（如：高数、歌单）"
            className="min-w-[220px] flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <select value={newTag} onChange={(e) => setNewTag(e.target.value as VideoTag)} aria-label="关键词标签">
            {TAG_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button variant="primary" icon="plus" onClick={handleAdd} disabled={!newKeyword.trim() || !enabled}>
            添加
          </Button>
        </div>
      </Card>

      {keywordItems.length === 0 ? (
        <EmptyState icon="tag" title="暂无关键词规则" description="添加关键词后，相关视频会自动放行。" />
      ) : (
        <div className="grid gap-2.5">
          {keywordItems.map((item) => (
            <div key={item.keyword} className="fm-row items-center">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-tertiary text-tertiary">
                <span className="font-mono text-[12px]">#</span>
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[13px] text-primary">{item.keyword}</p>
                <p className="mt-0.5 text-[11px] text-muted">标题包含即放行</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={item.tag}
                  onChange={(e) => handleTagChange(item.keyword, e.target.value as VideoTag)}
                  className="min-h-8 py-1 text-[12px]"
                  aria-label={`${item.keyword} 的标签`}
                >
                  {TAG_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button variant="subtle" size="sm" icon="trash" onClick={() => handleDelete(item.keyword)}>
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
