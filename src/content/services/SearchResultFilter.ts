/**
 * 搜索结果过滤器
 * 支持模糊匹配和拼音匹配
 */
export class SearchResultFilter {
  private keyword: string;
  private keywordLower: string;
  private keywordPinyin: string;
  
  constructor(keyword: string) {
    this.keyword = keyword;
    this.keywordLower = keyword.toLowerCase();
    this.keywordPinyin = this.toPinyin(keyword);
  }
  
  /**
   * 获取原始关键词
   */
  getKeyword(): string {
    return this.keyword;
  }
  
  /**
   * 检查标题是否匹配关键词
   * 支持：精确匹配、模糊匹配、拼音匹配
   */
  isTitleMatch(title: string): boolean {
    if (!title) return false;
    
    const titleLower = title.toLowerCase();
    
    // 1. 精确包含
    if (titleLower.includes(this.keywordLower)) {
      return true;
    }
    
    // 2. 拼音匹配
    const titlePinyin = this.toPinyin(title);
    if (titlePinyin.includes(this.keywordPinyin)) {
      return true;
    }
    
    // 3. 首字母拼音匹配
    const titleFirstLetters = this.getFirstLetters(title);
    if (titleFirstLetters.includes(this.keywordLower)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 简单的中文转拼音实现
   * 使用Unicode范围判断是否为中文字符
   */
  private toPinyin(text: string): string {
    // 简化实现：只保留字母和数字，去除空格和标点
    return text.replace(/[^\w\u4e00-\u9fff]/g, '').toLowerCase();
  }
  
  /**
   * 获取首字母拼音
   * 简化实现：提取中文字符的首字母
   */
  private getFirstLetters(text: string): string {
    const letters: string[] = [];
    for (const char of text) {
      if (/[\u4e00-\u9fff]/.test(char)) {
        // 中文字符，提取首字母（简化实现）
        letters.push(this.getLetter(char));
      } else if (/[a-zA-Z0-9]/.test(char)) {
        letters.push(char.toLowerCase());
      }
    }
    return letters.join('');
  }
  
  /**
   * 获取中文字符的首字母（简化实现）
   * 基于Unicode范围估算
   */
  private getLetter(char: string): string {
    const code = char.charCodeAt(0);
    // 常见汉字的首字母映射（简化版本）
    // 实际应用中应使用完整的拼音库
    if (code >= 0x4e00 && code <= 0x9fff) {
      // 简化：返回字符本身用于匹配
      return char;
    }
    return char.toLowerCase();
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
      
      // 隐藏广告
      if (config.hideAds && isAd) {
        shouldHide = true;
      }
      
      // 隐藏标题不匹配的结果
      if (config.hideNonKeyword && !this.isTitleMatch(title)) {
        shouldHide = true;
      }
      
      // 应用隐藏
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
