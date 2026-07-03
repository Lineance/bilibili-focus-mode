import React from 'react';
import type { ExtensionConfig } from '@core/types';

interface KeywordSectionProps {
  config: ExtensionConfig;
}

export function KeywordSection({ config }: KeywordSectionProps): React.JSX.Element {
  const openManager = () => {
    window.open(chrome.runtime.getURL('src/manager/index.html#keywords'), '_blank');
  };

  const keywords = config.keywordRules?.keywords || [];
  const isEnabled = config.keywordRules?.enabled ?? false;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🔑</span>
          <span>关键词规则</span>
          <span className="text-sm font-normal text-muted">({keywords.length})</span>
        </h2>
        <button onClick={openManager} className="text-sm text-accent-primary hover:underline">
          管理
        </button>
      </div>

      {/* 状态指示 */}
      <div className={`rounded-lg p-3 mb-3 ${isEnabled ? 'bg-success/20 border border-success/50' : 'bg-tertiary'}`}>
        <p className={`text-sm font-medium ${isEnabled ? 'text-success' : 'text-muted'}`}>
          {isEnabled ? '✅ 已启用自动放行' : '⏸️ 自动放行已禁用'}
        </p>
      </div>

      {keywords.length === 0 ? (
        <p className="text-muted text-center py-4">暂无关键词规则</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-tertiary rounded-full text-sm text-primary"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted mt-3">
        包含这些关键词的视频标题将自动放行
      </p>
    </div>
  );
}