import React from 'react';
import type { PermanentGroup, VideoMetadata } from '@core/types';
import { Card, EmptyState, Icon, SectionHeader, TagChip, type IconName } from '@ui';

interface PermanentSectionProps {
  groups: PermanentGroup[];
}

const COVER_PLACEHOLDER = chrome.runtime.getURL('cover-placeholder.svg');

const GROUP_ICON: Record<string, IconName> = {
  learning: 'book',
  entertainment: 'gamepad',
  music: 'music',
};

export function PermanentSection({ groups }: PermanentSectionProps): React.JSX.Element {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  const renderCard = (item: VideoMetadata) => (
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
      </div>
    </div>
  );

  return (
    <div>
      <SectionHeader
        title="永久分组"
        icon="folder"
        count={total}
        description="长期免审的收藏级视频，按标签归档。"
      />

      {total === 0 ? (
        <EmptyState icon="folder" title="暂无永久分组" description="在待审池中选择「永久」即可长期放行。" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="fm-section-title mb-0">
                  <Icon name={GROUP_ICON[group.id] ?? 'folder'} size={16} />
                  {group.name}
                  <span className="rounded-full bg-tertiary px-2 py-0.5 font-mono text-[11px] font-normal text-tertiary">
                    {group.items.length}
                  </span>
                </h3>
                <TagChip tag={group.items[0]?.tag ?? 'ENTERTAINMENT'} showIcon={false} />
              </div>

              {group.items.length === 0 ? (
                <p className="fm-hint py-4 text-center">暂无视频</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {group.items.map(renderCard)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
