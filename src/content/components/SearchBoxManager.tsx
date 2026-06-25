/* eslint-disable react-refresh/only-export-components */

import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BILIBILI_SEARCH_URL } from '@core/constants';
import { SearchBox } from './SearchBox';

function SearchBoxShell({ keyword, centered }: { keyword: string; centered: boolean }) {
  return (
    <StrictMode>
      <SearchBox keyword={keyword} centered={centered} />
    </StrictMode>
  );
}

const SEARCH_PAGE_CSS = `
  /* 隐藏搜索下拉栏目（热搜等） */
  .search-panel-popover,
  .search-panel,
  .trending,
  .trendings-double {
    display: none !important;
  }

  /* 隐藏搜索历史 */
  .search-panel-popover .history-item,
  .search-panel-popover .history {
    display: none !important;
  }

  /* 隐藏头部导航栏 */
  #bili-header-container {
    display: none !important;
  }
`;

export class SearchBoxManager {
  private container: HTMLDivElement | null = null;
  private root: Root | null = null;
  private styleEl: HTMLStyleElement | null = null;
  private currentUrl: string | null = null;

  isSearchPage(): boolean {
    return window.location.href.startsWith(BILIBILI_SEARCH_URL);
  }

  check(): void {
    if (!this.isSearchPage()) {
      this.remove();
      return;
    }

    const url = window.location.href;
    if (url === this.currentUrl) return;
    this.currentUrl = url;

    this.injectStyles();

    const params = new URLSearchParams(window.location.search);
    const keyword = params.get('keyword') || '';
    const isEntryPage = !keyword;

    this.hideNativeElements(isEntryPage);
    this.mount(keyword, isEntryPage);
  }

  private injectStyles(): void {
    if (this.styleEl) return;
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'bilibili-focus-mode-search-styles';
    this.styleEl.textContent = SEARCH_PAGE_CSS;
    document.head.appendChild(this.styleEl);
  }

  private hideNativeElements(isEntryPage: boolean): void {
    const header = document.getElementById('bili-header-container');
    if (header) {
      header.style.setProperty('display', 'none', 'important');
    }

    if (isEntryPage) {
      const app = document.getElementById('app');
      if (app) {
        app.style.setProperty('display', 'none', 'important');
      }
    } else {
      const searchInputContainers = document.querySelectorAll(
        '.search-header .search-input-container, .search-input-container'
      );
      searchInputContainers.forEach((el) => {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      const searchHeader = document.querySelector('.search-header');
      if (searchHeader) {
        (searchHeader as HTMLElement).style.setProperty('display', 'none', 'important');
      }
    }
  }

  private mount(keyword: string, centered: boolean): void {
    this.remove();

    this.container = document.createElement('div');
    this.container.id = 'bilibili-focus-mode-searchbox-host';
    document.body.appendChild(this.container);

    this.root = createRoot(this.container);
    this.root.render(
      <SearchBoxShell keyword={keyword} centered={centered} />
    );
  }

  remove(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
    this.currentUrl = null;
  }
}
