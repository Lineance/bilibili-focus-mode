import React from 'react';
import type { AllowedUploader } from '@core/types';
import { Card, EmptyState, Icon } from '@ui';

export function UploaderSection({ uploaders }: UploaderSectionProps): React.JSX.Element {
  const openManager = () => {
    window.open(chrome.runtime.getURL('src/manager/index.html#uploaders'), '_blank');
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="fm-section-title mb-0">
          <Icon name="user" size={16} />
          UP 主白名单
          <span className="rounded-full bg-tertiary px-2 py-0.5 font-mono text-[11px] font-normal text-tertiary">
            {uploaders.length}
          </span>
        </h2>
        <button type="button" onClick={openManager} className="text-[12px] text-accent hover:underline">
          管理
        </button>
      </div>

      {uploaders.length === 0 ? (
        <EmptyState icon="user" title="暂无白名单 UP 主" description="在管理页添加长期信任的 UP 主。" />
      ) : (
        <div className="grid max-h-[300px] gap-2 overflow-y-auto">
          {uploaders.map((uploader) => (
            <div key={uploader.id} className="flex items-center gap-2.5 rounded-lg bg-tertiary px-3 py-2">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent/20 text-[12px] font-medium text-accent">
                {uploader.name.charAt(0)}
              </span>
              <span className="truncate text-[12.5px] text-primary">{uploader.name}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

interface UploaderSectionProps {
  uploaders: AllowedUploader[];
}
