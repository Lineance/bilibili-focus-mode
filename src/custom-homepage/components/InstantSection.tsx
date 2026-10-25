import React, { useCallback, useEffect, useState } from 'react';
import type { InstantItem } from '@core/types';
import { EmptyState, SectionHeader, TagChip } from '@ui';

interface InstantSectionProps {
  items: InstantItem[];
}

const COVER_PLACEHOLDER = chrome.runtime.getURL('cover-placeholder.svg');

export function InstantSection({ items }: InstantSectionProps): React.JSX.Element {
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const formatExpiry = useCallback((expiresAt: number): string => {
    const remaining = expiresAt - currentTime;
    if (remaining <= 0) return '已过期';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) return `${Math.floor(hours / 24)} 天后过期`;
    return hours > 0 ? `${hours} 小时 ${minutes} 分后过期` : `${minutes} 分钟后过期`;
  }, [currentTime]);

  return (
    <div>
      <SectionHeader
        title="即时许可"
        icon="bolt"
        count={items.length}
        description="带有效期的放行；到期后自动失效。"
      />

      {items.length === 0 ? (
        <EmptyState icon="bolt" title="暂无即时许可" description="在待审池中选择「立即」即可添加。" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <div
              key={item.bvid}
              className="video-card cursor-pointer"
              onClick={() => window.open(`https://www.bilibili.com/video/${item.bvid}`, '_blank')}
            >
              <img
                src={item.coverUrl || COVER_PLACEHOLDER}
                alt={item.title}
                className="video-card-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = COVER_PLACEHOLDER;
                }}
              />
              <div className="video-card-info">
                <p className="video-card-title">{item.title}</p>
                <p className="video-card-uploader">{item.uploader}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <TagChip tag={item.tag} showIcon={false} />
                  <span className="text-[10.5px] text-muted">{formatExpiry(item.expiresAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
