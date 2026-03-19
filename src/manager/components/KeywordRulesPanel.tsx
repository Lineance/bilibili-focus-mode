import { useState } from 'react';

import type { ExtensionConfig } from '@core/types';

export function KeywordRulesPanel({ config }: { config: ExtensionConfig }) {
  const [keywords, setKeywords] = useState(config.keywordRules?.keywords || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [enabled, setEnabled] = useState(config.keywordRules?.enabled ?? true);
  const [message, setMessage] = useState('');

  const saveToStorage = async (newKeywords: string[], newEnabled: boolean) => {
    try {
      const storage = await chrome.storage.local.get();
      const newConfig = {
        ...storage.config,
        keywordRules: {
          enabled: newEnabled,
          keywords: newKeywords,
          tag: 'LEARNING' as const,
        },
      };
      await chrome.storage.local.set({ config: newConfig });
      setMessage('保存成功');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Failed to save keyword rules:', error);
      setMessage('保存失败');
    }
  };

  const handleAdd = async () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (keywords.includes(trimmed)) {
      setMessage('关键词已存在');
      return;
    }
    const newKeywords = [...keywords, trimmed];
    setKeywords(newKeywords);
    setNewKeyword('');
    await saveToStorage(newKeywords, enabled);
  };

  const handleDelete = async (keyword: string) => {
    const newKeywords = keywords.filter(k => k !== keyword);
    setKeywords(newKeywords);
    await saveToStorage(newKeywords, enabled);
  };

  const handleToggleEnabled = async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    await saveToStorage(keywords, newEnabled);
  };

  const handleExport = () => {
    const exportData = {
      version: 1,
      type: 'keyword-rules',
      exportDate: new Date().toISOString(),
      keywordRules: {
        enabled,
        keywords,
        tag: 'LEARNING' as const,
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

      if (!confirm(`导入将覆盖现有的 ${keywords.length} 个关键词，确定要继续吗？`)) {
        return;
      }

      const importedKeywords = data.keywordRules?.keywords || [];
      const importedEnabled = data.keywordRules?.enabled ?? true;

      setKeywords(importedKeywords);
      setEnabled(importedEnabled);
      await saveToStorage(importedKeywords, importedEnabled);
      setMessage(`导入成功：${importedKeywords.length} 个关键词`);
    } catch (error) {
      console.error('Import error:', error);
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
              className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
            >
              导出规则
            </button>
            <label className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700 cursor-pointer">
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
            <span className={enabled ? 'text-green-400' : 'text-gray-400'}>
              {enabled ? '已启用' : '已禁用'}
            </span>
          </label>
        </div>
      </div>

      <p className="text-gray-400 mb-4 text-sm">
        当视频标题包含以下关键词时，将自动放行并标记为学习类视频
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="输入关键词"
          className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          添加
        </button>
      </div>

      {keywords.length === 0 ? (
        <p className="text-gray-500">暂无关键词规则</p>
      ) : (
        <div className="grid gap-2">
          {keywords.map((keyword) => (
            <div
              key={keyword}
              className="flex justify-between items-center bg-gray-800 p-3 rounded"
            >
              <span className="font-mono text-green-400">{keyword}</span>
              <button
                onClick={() => handleDelete(keyword)}
                className="px-2 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
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