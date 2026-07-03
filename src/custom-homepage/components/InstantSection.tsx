import React from 'react';
import type { InstantItem } from '@core/types';

interface InstantSectionProps {
  items: InstantItem[];
}

export function InstantSection({ items }: InstantSectionProps): React.JSX.Element {
  const formatExpiry = (expiresAt: number): string => {
    const now = Date.now();
    const remaining = expiresAt - now;
    if (remaining <= 0) return '已过期';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}天后过期`;
    }
    return hours > 0 ? `${hours}小时${minutes}分钟后过期` : `${minutes}分钟后过期`;
  };

  const openVideo = (bvid: string) => {
    window.open(`https://www.bilibili.com/video/${bvid}`, '_blank');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span>⚡</span>
          <span>即时许可</span>
          <span className="text-sm font-normal text-muted">({items.length})</span>
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-muted">暂无即时许可视频</p>
          <p className="text-sm text-muted mt-1">在待审池中审批视频时选择"立即"添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item) => (
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
                <div className="flex items-center justify-between mt-2">
                  <span className={`tag ${item.tag === 'LEARNING' ? 'tag-learning' : item.tag === 'MUSIC' ? 'tag-music' : 'tag-entertainment'}`}>
                    {item.tag === 'LEARNING' ? '📚 学习' : item.tag === 'MUSIC' ? '🎵 音乐' : '🎮 娱乐'}
                  </span>
                  <span className="text-xs text-muted">
                    {formatExpiry(item.expiresAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}