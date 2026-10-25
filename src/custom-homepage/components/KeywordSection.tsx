import React from 'react';
import type { ExtensionConfig } from '@core/types';
import { Card, EmptyState, Icon, StatusChip } from '@ui';

export function KeywordSection({ config }: { config: ExtensionConfig }): React.JSX.Element {
  const openManager = () => {
    window.open(chrome.runtime.getURL('src/manager/index.html#keywords'), '_blank');
  };

  const keywords = config.keywordRules?.keywords || [];
  const isEnabled = config.keywordRules?.enabled ?? false;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="fm-section-title mb-0">
          <Icon name="tag" size={16} />
          关键词规则
          <span className="rounded-full bg-tertiary px-2 py-0.5 font-mono text-[11px] font-normal text-tertiary">
            {keywords.length}
          </span>
        </h2>
        <button type="button" onClick={openManager} className="text-[12px] text-accent hover:underline">
          管理
        </button>
      </div>

      <div className="mb-3">
        <StatusChip tone={isEnabled ? 'success' : 'neutral'} icon={isEnabled ? 'check' : 'clock'}>
          {isEnabled ? '自动放行已启用' : '自动放行已停用'}
        </StatusChip>
      </div>

      {keywords.length === 0 ? (
        <EmptyState icon="tag" title="暂无关键词规则" description="标题命中关键词的视频会自动放行。" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span key={keyword} className="rounded-full bg-tertiary px-3 py-1 font-mono text-[12px] text-primary">
              {keyword}
            </span>
          ))}
        </div>
      )}

      <p className="fm-hint mt-3">包含这些关键词的视频标题将自动放行，并按标签计入债务。</p>
    </Card>
  );
}
