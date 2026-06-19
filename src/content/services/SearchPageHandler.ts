import { SearchResultFilter } from './SearchResultFilter';
import { logger } from '@core/utils/logger';

interface SearchFilterConfig {
  enabled: boolean;
  hideAds: boolean;
  hideNonKeyword: boolean;
  hideLiveStreams: boolean;
}

export class SearchPageHandler {
  private filter: SearchResultFilter | null = null;
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  
  /**
   * 检测是否为搜索页面
   */
  isSearchPage(): boolean {
    return window.location.host === 'search.bilibili.com' ||
           window.location.pathname.startsWith('/search');
  }
  
  /**
   * 获取搜索关键词
   */
  getKeyword(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    const keyword = urlParams.get('keyword');
    // URLSearchParams.get() 会自动解码URL编码的字符串
    logger.debug('SearchPageHandler', 'Keyword from URL:', keyword);
    return keyword;
  }
  
  /**
   * 应用搜索过滤
   */
  applyFilter(config: SearchFilterConfig): void {
    if (!config.enabled || !this.isSearchPage()) {
      return;
    }
    
    const keyword = this.getKeyword();
    if (!keyword) {
      return;
    }
    
    // 创建过滤器
    this.filter = new SearchResultFilter(keyword);
    
    // 初始过滤
    this.filterResults(config);
    
    // 监听DOM变化，处理动态加载
    this.startObserver(config);
    
    logger.debug('SearchPageHandler', `Applied filter for keyword: ${keyword}`);
  }
  
  /**
   * 过滤搜索结果
   */
  private filterResults(config: SearchFilterConfig): void {
    if (!this.filter) return;
    
    // 使用防抖避免频繁执行
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.filter?.filterResults({
        hideAds: config.hideAds,
        hideNonKeyword: config.hideNonKeyword,
      });
    }, 300);
  }
  
  /**
   * 启动DOM变化监听
   */
  private startObserver(config: SearchFilterConfig): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver(() => {
      this.filterResults(config);
    });
    
    // 等待DOM准备好
    const attachObserver = () => {
      const searchContainer = document.querySelector('.search-page-wrapper, .video-list, .search-content');
      const target = searchContainer || document.body;
      
      if (target) {
        this.observer!.observe(target, {
          childList: true,
          subtree: true,
        });
      }
    };
    
    if (document.body) {
      attachObserver();
    } else {
      // 等待DOMContentLoaded
      document.addEventListener('DOMContentLoaded', attachObserver, { once: true });
    }
  }
  
  /**
   * 停止过滤，恢复所有结果
   */
  stopFilter(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.filter?.restoreAll();
    this.filter = null;
    
    logger.debug('SearchPageHandler', 'Stopped filter');
  }
}
