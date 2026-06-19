/**
 * 搜索结果过滤器
 * 搜索关键词与标题有任意公共子串即匹配
 * 不匹配的结果显示灰色蒙版，按行数渐进式遮罩
 */
export class SearchResultFilter {
  private keywordLower: string;
  private minLength = 2; // 最小匹配长度

  constructor(keyword: string) {
    this.keywordLower = keyword.toLowerCase();
  }

  /**
   * 检查搜索词和标题是否有公共子串（长度>=2）
   * 例如搜索"有旋场和无旋场"，标题"有旋场详解" → 匹配（公共子串"有旋场"）
   */
  isTitleMatch(title: string): boolean {
    if (!title) return false;
    const titleLower = title.toLowerCase();

    // 快速检查：标题包含搜索词
    if (titleLower.includes(this.keywordLower)) {
      return true;
    }

    // 标题长度>=2时，检查搜索词是否包含标题
    if (titleLower.length >= this.minLength && this.keywordLower.includes(titleLower)) {
      return true;
    }

    // 检查搜索词的子串是否在标题中（子串长度>=2）
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
   * - 广告和推广直接隐藏
   * - 不匹配的结果显示灰色蒙版，按行数渐进式遮罩
   */
  filterResults(config: { hideAds: boolean; hideNonKeyword: boolean }): void {
    if (!document.body) return;

    const cards = document.querySelectorAll('.bili-video-card');
    const COLS = 5; // B站搜索结果每行5列

    cards.forEach((card, index) => {
      const el = card as HTMLElement;
      const titleEl = card.querySelector('.bili-video-card__info--tit');
      const title = titleEl?.textContent || '';
      const link = card.querySelector('a');
      const isAd = link?.href?.includes('gaoneng.bilibili.com') ||
                   card.querySelector('.bili-video-card__stats--ad');

      // 广告和推广直接隐藏
      if (config.hideAds && isAd) {
        el.style.display = 'none';
        return;
      }

      // 不匹配的结果显示蒙版
      if (config.hideNonKeyword && !this.isTitleMatch(title)) {
        // 计算当前行（从1开始）
        const currentRow = Math.floor(index / COLS) + 1;
        // 从90%开始，每行增加2%，最大100%
        const opacity = Math.min(0.9 + (currentRow - 1) * 0.02, 1.0);

        el.setAttribute('data-filtered', 'true');
        el.style.setProperty('--filter-opacity', opacity.toString());
      }
    });
  }

  /**
   * 恢复所有被隐藏/蒙版的结果
   */
  restoreAll(): void {
    // 恢复蒙版卡片
    document.querySelectorAll('[data-filtered="true"]').forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.removeProperty('--filter-opacity');
      el.removeAttribute('data-filtered');
    });

    // 恢复被隐藏的广告
    document.querySelectorAll('.bili-video-card').forEach(card => {
      const el = card as HTMLElement;
      if (el.style.display === 'none') {
        el.style.display = '';
      }
    });
  }
}
