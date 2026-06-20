import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@core/utils/logger';

import type { ExtensionConfig, VideoTag } from '@core/types';
import { StorageRepository } from '@core/storage/StorageRepository';

interface KeywordItem {
  keyword: string;
  tag: VideoTag;
}

export function KeywordRulesPanel({ config }: { config: ExtensionConfig }): React.JSX.Element {
  // 优先使用 items 字段（每个关键词独立标签），否则从 keywords 数组创建
  const [keywordItems, setKeywordItems] = useState<KeywordItem[]>(() => {
    if (config.keywordRules?.items && config.keywordRules.items.length > 0) {
      return config.keywordRules.items;
    }
    return config.keywordRules?.keywords?.map((k: string) => ({
      keyword: k,
      tag: config.keywordRules?.tag || 'LEARNING',
    })) || [];
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [newTag, setNewTag] = useState<VideoTag>('LEARNING');
  const [enabled, setEnabled] = useState(config.keywordRules?.enabled ?? true);
  const [message, setMessage] = useState('');

  const saveToStorage = useCallback(async (items: KeywordItem[], newEnabled: boolean) => {
    try {
      await StorageRepository.update('config', (current) => ({
        ...current,
        keywordRules: {
          enabled: newEnabled,
          keywords: items.map(item => item.keyword),
          tag: 'LEARNING',
          items: items,
        },
      }));
      setMessage('保存成功');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      logger.error('KeywordRulesPanel', 'Failed to save keyword rules:', error);
      setMessage('保存失败');
    }
  }, []);

  // 迁移旧格式数据：如果有 keywords 但没有 items，自动保存一次
  useEffect(() => {
    const needsMigration = config.keywordRules?.keywords?.length > 0 && 
                          (!config.keywordRules.items || config.keywordRules.items.length === 0);
    if (needsMigration && keywordItems.length > 0) {
      logger.info('KeywordRulesPanel', 'Migrating keyword rules to items format');
      saveToStorage(keywordItems, enabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (keywordItems.some(item => item.keyword === trimmed)) {
      setMessage('关键词已存在');
      return;
    }
    const newItems = [...keywordItems, { keyword: trimmed, tag: newTag }];
    setKeywordItems(newItems);
    setNewKeyword('');
    await saveToStorage(newItems, enabled);
  };

  const handleDelete = async (keyword: string) => {
    const newItems = keywordItems.filter(item => item.keyword !== keyword);
    setKeywordItems(newItems);
    await saveToStorage(newItems, enabled);
  };

  const handleTagChange = async (keyword: string, newTag: VideoTag) => {
    const newItems = keywordItems.map(item =>
      item.keyword === keyword ? { ...item, tag: newTag } : item
    );
    setKeywordItems(newItems);
    await saveToStorage(newItems, enabled);
  };

  const handleToggleEnabled = async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    await saveToStorage(keywordItems, newEnabled);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">关键词自动放行规则</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggleEnabled}
            className="w-4 h-4 rounded"
          />
          <span className={enabled ? 'text-green-400' : 'text-secondary'}>
            {enabled ? '已启用' : '已禁用'}
          </span>
        </label>
      </div>

      <p className="text-secondary mb-4 text-sm">
        当视频标题包含以下关键词时，将自动放行并标记为对应类型
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="输入关键词"
          className="flex-1 px-3 py-2 bg-secondary rounded border border-secondary"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <select
          value={newTag}
          onChange={(e) => setNewTag(e.target.value as VideoTag)}
          className="px-3 py-2 bg-secondary rounded border border-secondary"
        >
          <option value="LEARNING">学习</option>
          <option value="MUSIC">音乐</option>
        </select>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-accent-primary rounded hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          添加
        </button>
      </div>

      {keywordItems.length === 0 ? (
        <p className="text-muted">暂无关键词规则</p>
      ) : (
        <div className="grid gap-2">
          {keywordItems.map((item) => (
            <div
              key={item.keyword}
              className="flex justify-between items-center bg-secondary p-3 rounded"
            >
              <div className="flex items-center gap-4 flex-1">
                <span className="font-mono text-green-400">{item.keyword}</span>
                <select
                  value={item.tag}
                  onChange={(e) => handleTagChange(item.keyword, e.target.value as VideoTag)}
                  className="px-2 py-1 bg-tertiary rounded border border-primary text-sm"
                >
                  <option value="LEARNING">学习</option>
                  <option value="MUSIC">音乐</option>
                </select>
              </div>
              <button
                onClick={() => handleDelete(item.keyword)}
                className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div className={`mt-4 text-sm ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
