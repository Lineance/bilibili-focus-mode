import { describe, it, expect } from 'vitest';
import { SearchResultFilter } from '@content/services/SearchResultFilter';

describe('SearchResultFilter', () => {
  describe('isTitleMatch', () => {
    it('should match when title contains keyword', () => {
      const filter = new SearchResultFilter('测试');
      expect(filter.isTitleMatch('AI软件测试教程')).toBe(true);
    });

    it('should match when keyword contains title', () => {
      const filter = new SearchResultFilter('有旋场和无旋场');
      expect(filter.isTitleMatch('有旋')).toBe(true);
    });

    it('should match when keyword substring is in title', () => {
      const filter = new SearchResultFilter('有旋场和无旋场');
      expect(filter.isTitleMatch('有旋场详解')).toBe(true);
    });

    it('should not match when no common substring', () => {
      const filter = new SearchResultFilter('测试');
      expect(filter.isTitleMatch('学习编程')).toBe(false);
    });

    it('should handle empty title', () => {
      const filter = new SearchResultFilter('测试');
      expect(filter.isTitleMatch('')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      const filter = new SearchResultFilter('TEST');
      expect(filter.isTitleMatch('test video')).toBe(true);
    });

    it('should match with minimum 2 chars', () => {
      const filter = new SearchResultFilter('有旋场');
      expect(filter.isTitleMatch('有旋')).toBe(true);
    });

    it('should not match single char', () => {
      const filter = new SearchResultFilter('有旋场');
      // "有" is 1 char, below minimum, should not match
      expect(filter.isTitleMatch('有')).toBe(false);
    });
  });

  describe('filterResults', () => {
    it('should set data-filtered attribute for non-matching titles', () => {
      // Mock DOM
      document.body.innerHTML = `
        <div class="bili-video-card">
          <div class="bili-video-card__info--tit">有旋场详解</div>
          <a href="https://www.bilibili.com/video/BV1xxx"></a>
        </div>
        <div class="bili-video-card">
          <div class="bili-video-card__info--tit">学习编程</div>
          <a href="https://www.bilibili.com/video/BV2xxx"></a>
        </div>
      `;

      const filter = new SearchResultFilter('有旋场');
      filter.filterResults({ hideAds: false, hideNonKeyword: true });

      const cards = document.querySelectorAll('.bili-video-card');
      expect(cards[0].hasAttribute('data-filtered')).toBe(false);
      expect(cards[1].hasAttribute('data-filtered')).toBe(true);
    });

    it('should set opacity from 0.9 by row', () => {
      // Create 15 cards (3 rows of 5)
      let html = '';
      for (let i = 0; i < 15; i++) {
        html += `
          <div class="bili-video-card">
            <div class="bili-video-card__info--tit">视频${i}</div>
            <a href="https://www.bilibili.com/video/BV${i}"></a>
          </div>
        `;
      }
      document.body.innerHTML = html;

      const filter = new SearchResultFilter('测试');
      filter.filterResults({ hideAds: false, hideNonKeyword: true });

      const cards = document.querySelectorAll('.bili-video-card');
      // First row (index 0-4): opacity = 0.9
      expect(parseFloat((cards[0] as HTMLElement).style.getPropertyValue('--filter-opacity'))).toBeCloseTo(0.9);
      // Second row (index 5-9): opacity = 0.92
      expect(parseFloat((cards[5] as HTMLElement).style.getPropertyValue('--filter-opacity'))).toBeCloseTo(0.92);
      // Third row (index 10-14): opacity = 0.94
      expect(parseFloat((cards[10] as HTMLElement).style.getPropertyValue('--filter-opacity'))).toBeCloseTo(0.94);
    });

    it('should hide ads with display:none', () => {
      document.body.innerHTML = `
        <div class="bili-video-card">
          <div class="bili-video-card__info--tit">正常视频</div>
          <a href="https://www.bilibili.com/video/BV1xxx"></a>
        </div>
        <div class="bili-video-card">
          <div class="bili-video-card__info--tit">广告视频</div>
          <a href="https://gaoneng.bilibili.com/xxx"></a>
          <div class="bili-video-card__stats--ad">广告</div>
        </div>
      `;

      const filter = new SearchResultFilter('测试');
      filter.filterResults({ hideAds: true, hideNonKeyword: false });

      const cards = document.querySelectorAll('.bili-video-card');
      expect((cards[0] as HTMLElement).style.display).not.toBe('none');
      expect((cards[1] as HTMLElement).style.display).toBe('none');
    });
  });

  describe('restoreAll', () => {
    it('should remove data-filtered attribute', () => {
      document.body.innerHTML = `
        <div class="bili-video-card" data-filtered="true" style="--filter-opacity: 0.5">
          <div class="bili-video-card__info--tit">测试视频</div>
        </div>
      `;

      const filter = new SearchResultFilter('测试');
      filter.restoreAll();

      const card = document.querySelector('.bili-video-card')!;
      expect(card.hasAttribute('data-filtered')).toBe(false);
      expect((card as HTMLElement).style.getPropertyValue('--filter-opacity')).toBe('');
    });

    it('should restore hidden ads', () => {
      document.body.innerHTML = `
        <div class="bili-video-card" style="display: none">
          <div class="bili-video-card__info--tit">广告视频</div>
        </div>
      `;

      const filter = new SearchResultFilter('测试');
      filter.restoreAll();

      const card = document.querySelector('.bili-video-card') as HTMLElement;
      expect(card.style.display).toBe('');
    });
  });
});
