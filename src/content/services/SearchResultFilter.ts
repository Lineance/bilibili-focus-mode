/**
 * 搜索结果过滤器
 * 搜索关键词与标题有任意公共子串即匹配
 */
export class SearchResultFilter {
  private keywordLower: string;
  private minLength = 2; // 最小匹配长度

  constructor(keyword: string) {
    this.keywordLower = keyword.toLowerCase();
    console.log('[SearchResultFilter] Created with keyword:', keyword, '→ lower:', this.keywordLower);
  }

  /**
   * 检查搜索词和标题是否有公共子串（长度>=2）
   * 例如搜索"有旋场和无旋场"，标题"有旋场详解" → 匹配（公共子串"有旋场"）
   */
  isTitleMatch(title: string): boolean {
    if (!title) return false;
    const titleLower = title.toLowerCase();
    
    // 快速检查：标题包含搜索词，或搜索词包含标题
    if (titleLower.includes(this.keywordLower) || this.keywordLower.includes(titleLower)) {
      return true;
    }
    
    // 检查搜索词的子串是否在标题中
    // 从长到短检查，找到匹配就返回
    for (let len = this.keywordLower.length; len >= this.minLength; len--) {
      for (let i = 0; i <= this.keywordLower.length - len; i++) {
        const substr = this.keywordLower.substring(i, i + len);
        if (titleLower.includes(substr)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 过滤搜索结果
   */
  filterResults(config: { hideAds: boolean; hideNonKeyword: boolean }): void {
    if (!document.body) return;
    
    const cards = document.querySelectorAll('.bili-video-card');
    console.log('[SearchResultFilter] Filtering', cards.length, 'cards, config:', config);
    
    cards.forEach(card => {
      const titleEl = card.querySelector('.bili-video-card__info--tit');
      const title = titleEl?.textContent || '';
      const link = card.querySelector('a');
      const isAd = link?.href?.includes('gaoneng.bilibili.com') || 
                   card.querySelector('.bili-video-card__stats--ad');

      let shouldHide = false;

      if (config.hideAds && isAd) {
        shouldHide = true;
        console.log('[SearchResultFilter] Hiding ad:', title);
      }

      if (config.hideNonKeyword && !this.isTitleMatch(title)) {
        shouldHide = true;
        console.log('[SearchResultFilter] Hiding no match:', title);
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
