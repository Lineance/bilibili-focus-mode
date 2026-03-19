import { VideoCover } from './VideoCover';

export function ItemCard({
  item,
  selected,
  onSelect,
  onDelete,
  children,
}: {
  item: { bvid: string; title: string; uploader: string; coverUrl: string };
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  // Generate video URL
  const videoUrl = item.bvid.startsWith('LIVE_')
    ? `https://live.bilibili.com/${item.bvid.replace('LIVE_', '')}`
    : `https://www.bilibili.com/video/${item.bvid}`;

  return (
    <div className={`bg-gray-800 p-4 rounded-lg flex gap-4 items-center ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
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
        <p className="text-sm text-gray-400">{item.uploader}</p>
        {children}
      </div>
      <button
        onClick={onDelete}
        className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
        title="删除"
      >
        删除
      </button>
    </div>
  );
}