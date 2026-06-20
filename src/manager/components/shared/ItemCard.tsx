import React from 'react';
import { getVideoUrl } from '@core/utils/videoUrl';

import { VideoCover } from './VideoCover';

export const ItemCard = React.memo(function ItemCard({
  item,
  selected,
  onSelect,
  onDelete,
  small = false,
  children,
}: {
  item: { bvid: string; title: string; uploader: string; coverUrl: string };
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  small?: boolean;
  children?: React.ReactNode;
}): React.JSX.Element {
  const videoUrl = getVideoUrl(item.bvid);

  if (small) {
    return (
      <div className={`flex gap-3 items-center bg-tertiary p-3 rounded ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="w-4 h-4 rounded border-primary text-blue-600 focus:ring-blue-500"
        />
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <VideoCover url={item.coverUrl} title={item.title} small />
        </a>
        <div className="flex-1 min-w-0">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm truncate hover:text-blue-400 transition-colors block"
          >
            {item.title}
          </a>
          <p className="text-xs text-secondary">{item.uploader}</p>
          {children}
        </div>
        <button
          onClick={onDelete}
          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 flex-shrink-0 transition-colors"
          title="删除"
        >
          删除
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-secondary p-4 rounded-lg flex gap-4 items-center ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        className="w-5 h-5 rounded border-primary text-blue-600 focus:ring-blue-500"
      />
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        <VideoCover url={item.coverUrl} title={item.title} />
      </a>
      <div className="flex-1">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium mb-1 hover:text-blue-400 transition-colors block"
        >
          {item.title}
        </a>
        <p className="text-sm text-secondary">{item.uploader}</p>
        {children}
      </div>
      <button
        onClick={onDelete}
        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
        title="删除"
      >
        删除
      </button>
    </div>
  );
});