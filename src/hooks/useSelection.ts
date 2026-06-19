import { useState, useCallback } from 'react';

/**
 * Custom hook for managing list item selection
 */
export function useSelection(allBvids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((bvid: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(bvid)) {
        next.delete(bvid);
      } else {
        next.add(bvid);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(allBvids));
  }, [allBvids]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((bvid: string) => {
    return selected.has(bvid);
  }, [selected]);

  return {
    selected,
    selectedCount: selected.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
}
