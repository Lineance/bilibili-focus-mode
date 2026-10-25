import React from 'react';
import { getVideoUrl } from '@core/utils/videoUrl';
import type { VideoTag } from '@core/types';
import { TagChip } from '@ui';
import { VideoCover } from './VideoCover';

interface VideoRowProps {
  bvid: string;
  title: string;
  uploader?: string;
  coverUrl?: string;
  tag?: VideoTag;
  selected?: boolean;
  onSelect?: () => void;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

export const VideoRow = React.memo(function VideoRow({
  bvid,
  title,
  uploader,
  coverUrl = '',
  tag,
  selected = false,
  onSelect,
  meta,
  actions,
  footer,
}: VideoRowProps): React.JSX.Element {
  const videoUrl = getVideoUrl(bvid);

  return (
    <div className={`fm-row ${selected ? 'fm-row--selected' : ''}`}>
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          aria-label={`选择 ${title}`}
          className="mt-1"
        />
      )}

      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <VideoCover url={coverUrl} title={title} />
      </a>

      <div className="min-w-0 flex-1">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-[13.5px] font-medium leading-snug transition-colors hover:text-accent"
        >
          {title || bvid}
        </a>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-tertiary">
          {tag && <TagChip tag={tag} />}
          {uploader && <span className="max-w-[220px] truncate">{uploader}</span>}
          {meta}
        </div>

        {footer && <div className="mt-2">{footer}</div>}

        {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
});
