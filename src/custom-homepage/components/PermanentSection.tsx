import React from 'react';
import type { PermanentGroup, VideoMetadata } from '@core/types';

interface PermanentSectionProps {
  groups: PermanentGroup[];
}

export function PermanentSection({ groups }: PermanentSectionProps): React.JSX.Element {
  const openVideo = (bvid: string) => {
    window.open(`https://www.bilibili.com/video/${bvid}`, '_blank');
  };

  const renderGroup = (group: PermanentGroup) => (
    <div key={group.id} className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>{group.id === 'learning' ? '📚' : '🎮'}</span>
          <span>{group.name}</span>
          <span className="text-sm font-normal text-muted">({group.items.length})</span>
        </h3>
      </div>

      {group.items.length === 0 ? (
        <p className="text-muted text-center py-4">暂无视频</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {group.items.map((item: VideoMetadata) => (
            <div
              key={item.bvid}
              className="video-card cursor-pointer"
              onClick={() => openVideo(item.bvid)}
            >
              <img
                src={item.coverUrl || `https://picsum.photos/seed/${item.bvid}/320/180`}
                alt={item.title}
                className="video-card-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.bvid}/320/180`;
                }}
              />
              <div className="video-card-info">
                <p className="video-card-title">{item.title}</p>
                <p className="video-card-uploader">{item.uploader}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span>📁</span>
          <span>永久分组</span>
        </h2>
      </div>

      {groups.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-muted">暂无永久分组</p>
          <p className="text-sm text-muted mt-1">在待审池中审批视频时选择"永久"添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map(renderGroup)}
        </div>
      )}
    </div>
  );
}