import React, { useState } from 'react';
import { logger } from '@core/utils/logger';

import type { ExtensionConfig, VideoTag } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';

interface KeywordItem {
  keyword: string;
  tag: VideoTag;
}

export function KeywordRulesPanel({ config }: { config: ExtensionConfig }): React.JSX.Element {
  const [keywordItems, setKeywordItems] = useState<KeywordItem[]>(
    config.keywordRules?.keywords?.map((k: string) => ({
      keyword: k,
      tag: config.keywordRules?.tag || 'LEARNING',
    })) || []
  );
  const [newKeyword, setNewKeyword] = useState('');
  const [newTag, setNewTag] = useState<VideoTag>('LEARNING');
  const [enabled, setEnabled] = useState(config.keywordRules?.enabled ?? true);
  const [message, setMessage] = useState('');

  const saveToStorage = async (items: KeywordItem[], newEnabled: boolean) => {
    try {
      const storage = await chrome.storage.local.get();
      const newConfig: ExtensionConfig = {
        ...(storage.config as ExtensionConfig) || DEFAULT_STORAGE.config,
        keywordRules: {
          enabled: newEnabled,
          keywords: items.map(item => item.keyword),
          tag: 'LEARNING', // 保留字段以兼容旧版本
        },
      };
      await chrome.storage.local.set({ config: newConfig });
      setMessage('保存成功');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      logger.error('KeywordRulesPanel', 'Failed to save keyword rules:', error);
      setMessage('保存失败');
    }
  };

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

  const handleExport = () => {
    const exportData = {
      version: 1,
      type: 'keyword-rules',
      exportDate: new Date().toISOString(),
      keywordRules: {
        enabled,
        keywords: keywordItems.map(item => item.keyword),
        items: keywordItems, // 新增：包含每个关键词的标签信息
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyword-rules-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage('导出成功');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.type !== 'keyword-rules') {
        setMessage('导入失败：不是关键词规则文件');
        return;
      }

      if (!confirm(`导入将覆盖现有的 ${keywordItems.length} 个关键词，确定要继续吗？`)) {
        return;
      }

      // 支持新旧两种格式
      let importedItems: KeywordItem[] = [];
      if (data.keywordRules?.items) {
        // 新格式：包含每个关键词的标签
        importedItems = data.keywordRules.items;
      } else {
        // 旧格式：统一使用默认标签
        const importedKeywords = data.keywordRules?.keywords || [];
        const importedTag = data.keywordRules?.tag || 'LEARNING';
        importedItems = importedKeywords.map((k: string) => ({ keyword: k, tag: importedTag }));
      }

      const importedEnabled = data.keywordRules?.enabled ?? true;

      setKeywordItems(importedItems);
      setEnabled(importedEnabled);
      await saveToStorage(importedItems, importedEnabled);
      setMessage(`导入成功：${importedItems.length} 个关键词`);
    } catch (error) {
      logger.error('KeywordRulesPanel', 'Import error:', error);
      setMessage('导入失败：文件格式错误');
    }

    event.target.value = '';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">关键词自动放行规则</h2>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1 bg-accent-primary rounded text-sm hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              导出规则
            </button>
            <label className="px-3 py-1 bg-accent-primary rounded text-sm hover:bg-accent-primary/90 cursor-pointer transition-colors">
              导入规则
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
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