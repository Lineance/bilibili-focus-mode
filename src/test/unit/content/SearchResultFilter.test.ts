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
      // "有旋场" is a substring of keyword, and title contains "有旋场"
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
      // "有旋" is 2 chars, should match
      expect(filter.isTitleMatch('有旋')).toBe(true);
    });

    it('should not match single char', () => {
      const filter = new SearchResultFilter('有旋场');
      // "有" is 1 char, below minimum
      expect(filter.isTitleMatch('有')).toBe(false);
    });
  });
});
