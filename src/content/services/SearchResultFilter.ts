/**
 * 搜索结果过滤器
 * 搜索关键词与标题有任意公共子串即匹配
 */
export class SearchResultFilter {
  private keywordLower: string;

  constructor(keyword: string) {
    this.keywordLower = keyword.toLowerCase();
  }

  /**
   * 检查搜索词和标题是否有公共子串
   * 例如搜索"有旋场和无旋场"，标题"有旋场详解" → 匹配
   */
  isTitleMatch(title: string): boolean {
    if (!title) return false;
    const titleLower = title.toLowerCase();
    // 关键词是标题子串，或标题是关键词子串
    return titleLower.includes(this.keywordLower) || this.keywordLower.includes(titleLower);
  }

  /**
   * 过滤搜索结果
   */
  filterResults(config: { hideAds: boolean; hideNonKeyword: boolean }): void {
    document.querySelectorAll('.bili-video-card').forEach(card => {
      const titleEl = card.querySelector('.bili-video-card__info--tit');
      const title = titleEl?.textContent || '';
      const link = card.querySelector('a');
      const isAd = link?.href?.includes('gaoneng.bilibili.com') || 
                   card.querySelector('.bili-video-card__stats--ad');

      let shouldHide = false;

      if (config.hideAds && isAd) {
        shouldHide = true;
      }

      if (config.hideNonKeyword && !this.isTitleMatch(title)) {
        shouldHide = true;
      }

      if (shouldHide) {
        (card as HTMLElement).style.display = 'none';
        card.setAttribute('data-filtered', 'true');
      }
    });
  }

  /**
   * 恢复所有被隐藏的结果
   */
  restoreAll(): void {
    document.querySelectorAll('[data-filtered="true"]').forEach(el => {
      (el as HTMLElement).style.display = '';
      el.removeAttribute('data-filtered');
    });
  }
}
