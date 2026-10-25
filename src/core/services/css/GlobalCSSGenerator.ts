export class GlobalCSSGenerator {
  generate(): string {
    return `
      /* 搜索入口页：只保留搜索框，其余入口内容隐藏 */
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
      /* 隐藏搜索入口页主体内容 */
      #app > div > div.search-entry-page.p_relative > div > div > div > div > div {
        display: none !important;
      }

      /* 隐藏原生搜索栏（入口页 + 结果页） */
      .search-entry-page .search-input-container,
      .search-header .search-input-container {
        display: none !important;
      }

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
