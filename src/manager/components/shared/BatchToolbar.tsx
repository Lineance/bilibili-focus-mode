export function BatchToolbar({
  selectedCount,
  onSelectAll,
  onDeleteSelected,
  onClearSelection,
  totalCount,
}: {
  selectedCount: number;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  totalCount: number;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg px-6 py-3 flex items-center gap-4 shadow-lg z-50">
      <span className="text-sm">已选择 {selectedCount} 项</span>
      <div className="flex gap-2">
        <button
          onClick={onSelectAll}
          className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
        >
          全选 ({totalCount})
        </button>
        <button
          onClick={onClearSelection}
          className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
        >
          取消选择
        </button>
        <button
          onClick={onDeleteSelected}
          className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
        >
          批量删除
        </button>
      </div>
    </div>
  );
}
