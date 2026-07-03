import React from 'react';
import type { AllowedUploader } from '@core/types';

interface UploaderSectionProps {
  uploaders: AllowedUploader[];
}

export function UploaderSection({ uploaders }: UploaderSectionProps): React.JSX.Element {
  const openManager = () => {
    window.open(chrome.runtime.getURL('src/manager/index.html#uploaders'), '_blank');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>👤</span>
          <span>UP 主白名单</span>
          <span className="text-sm font-normal text-muted">({uploaders.length})</span>
        </h2>
        <button onClick={openManager} className="text-sm text-accent-primary hover:underline">
          管理
        </button>
      </div>

      {uploaders.length === 0 ? (
        <p className="text-muted text-center py-4">暂无白名单 UP 主</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {uploaders.map((uploader) => (
            <div
              key={uploader.id}
              className="flex items-center gap-2 p-2 bg-tertiary rounded-lg"
            >
              <span className="w-8 h-8 bg-accent-primary/20 rounded-full flex items-center justify-center text-sm">
                {uploader.name.charAt(0)}
              </span>
              <span className="text-primary truncate">{uploader.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}