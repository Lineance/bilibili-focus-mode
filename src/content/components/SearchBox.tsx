import { useState, useCallback } from 'react';
import { BILIBILI_SEARCH_URL } from '@core/constants';
import './SearchBox.css';

interface SearchBoxProps {
  keyword?: string;
  centered?: boolean;
}

export function SearchBox({ keyword = '', centered = false }: SearchBoxProps) {
  const [value, setValue] = useState(keyword);

  const handleSearch = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    window.location.href = `${BILIBILI_SEARCH_URL}/all?keyword=${encodeURIComponent(trimmed)}`;
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  return (
    <div className={`bfm-searchbox-host${centered ? ' bfm-searchbox-host--center' : ''}`}>
      <div className="bfm-searchbox">
        <input
          className="bfm-searchbox__input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入关键词搜索"
          autoFocus={centered}
        />
        <button
          className="bfm-searchbox__btn"
          onClick={handleSearch}
        >
          搜索
        </button>
      </div>
    </div>
  );
}
