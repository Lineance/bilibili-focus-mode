import React from 'react';
import { Card, Icon, type IconName } from '@ui';

const ACTIONS: Array<{ tab: string; label: string; icon: IconName }> = [
  { tab: 'permanent', label: '永久分组', icon: 'folder' },
  { tab: 'stats', label: '统计', icon: 'chart' },
  { tab: 'uploaders', label: 'UP 主白名单', icon: 'user' },
  { tab: 'keywords', label: '关键词规则', icon: 'tag' },
  { tab: 'config', label: '配置', icon: 'sliders' },
];

export function QuickActions(): React.JSX.Element {
  const openManager = (tab?: string) => {
    const url = chrome.runtime.getURL('src/manager/index.html');
    window.open(tab ? `${url}#${tab}` : url, '_blank');
  };

  return (
    <Card>
      <h2 className="fm-section-title">
        <Icon name="bolt" size={16} />
        快捷操作
      </h2>

      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.tab}
            type="button"
            onClick={() => openManager(action.tab)}
            className="flex items-center gap-2 rounded-lg border border-secondary px-3 py-2 text-[12.5px] text-secondary transition-colors hover:border-accent/50 hover:text-primary"
          >
            <Icon name={action.icon} size={15} />
            {action.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
