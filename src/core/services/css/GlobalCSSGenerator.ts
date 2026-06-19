export class GlobalCSSGenerator {
  generate(): string {
    return `
      #bili-header-container > div {
        display: none !important;
      }

      /* 搜索页面：只显示搜索框，隐藏其他内容 */
      .search-entry-page .search-entry-page-content,
      .search-entry-page .search-entry-page-content > div:not(.search-entry-page-input) {
        display: none !important;
      }
    `;
  }

  /**
   * 生成搜索页面简化CSS
   * 隐藏搜索页面的所有内容，只保留搜索框
   */
  generateSearchPageSimplification(): string {
    return `
      /* 隐藏搜索页面主体内容 */
      #app > div > div.search-entry-page.p_relative > div > div > div > div > div {
        display: none !important;
      }

      /* 隐藏搜索下拉栏目（热搜等） */
      .search-panel-popover,
      .search-panel,
      .trending,
      .trendings-double {
        display: none !important;
      }

      /* 隐藏侧边栏按钮 */
      .side-buttons-container,
      .side-buttons-wrapper {
        display: none !important;
      }

      /* 隐藏页脚 */
      #biliMainFooter,
      .biliMainFooterWrapper,
      .bili-footer {
        display: none !important;
      }

      /* 隐藏搜索结果区域 */
      .search-page,
      .search-page .video-list,
      .search-page .user-list,
      .search-page .bangumi-list,
      .search-page .pgc-list,
      .search-page .live-list,
      .search-page .article-list,
      .search-page .topic-list,
      .search-page .activity-list {
        display: none !important;
      }

      /* 隐藏侧边栏 */
      .search-page .aside,
      .search-page .right-side {
        display: none !important;
      }

      /* 隐藏筛选器 */
      .search-page .filter-wrap,
      .search-page .search-filter {
        display: none !important;
      }

      /* 确保搜索框可见且居中 */
      .search-entry-page .search-input-container {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        min-height: 50vh !important;
      }

      /* 隐藏搜索框旁边的logo */
      .search-logo {
        display: none !important;
      }

      /* 隐藏标题 */
      .search-center-title {
        display: none !important;
      }
    `;
  }
}
