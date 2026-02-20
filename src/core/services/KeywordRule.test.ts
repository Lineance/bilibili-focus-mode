import { describe, it, expect } from 'vitest';
import { KeywordRule } from './KeywordRule';
import type { KeywordRuleConfig } from './KeywordRule';

describe('KeywordRule', () => {
  const createRule = (config: Partial<KeywordRuleConfig> = {}) => {
    const defaultConfig: KeywordRuleConfig = {
      enabled: true,
      keywords: ['playlist', '歌单'],
      tag: 'LEARNING',
    };
    return new KeywordRule({ ...defaultConfig, ...config });
  };

  describe('check', () => {
    it('should return tag when title contains keyword', () => {
      const rule = createRule();
      
      expect(rule.check('My Playlist 2024')).toBe('LEARNING');
      expect(rule.check('Best 歌单 Collection')).toBe('LEARNING');
    });

    it('should be case insensitive', () => {
      const rule = createRule();
      
      expect(rule.check('MY PLAYLIST')).toBe('LEARNING');
      expect(rule.check('Playlist Music')).toBe('LEARNING');
    });

    it('should return null when no keyword matches', () => {
      const rule = createRule();
      
      expect(rule.check('Random Video Title')).toBeNull();
      expect(rule.check('')).toBeNull();
    });

    it('should return null when disabled', () => {
      const rule = createRule({ enabled: false });
      
      expect(rule.check('My Playlist')).toBeNull();
    });

    it('should return null when no keywords configured', () => {
      const rule = createRule({ keywords: [] });
      
      expect(rule.check('My Playlist')).toBeNull();
    });

    it('should match partial words', () => {
      const rule = createRule({ keywords: ['list'] });
      
      expect(rule.check('My Playlist')).toBe('LEARNING');
      expect(rule.check('List of items')).toBe('LEARNING');
    });
  });

  describe('getConfig', () => {
    it('should return current config', () => {
      const rule = createRule({ keywords: ['test'] });
      const config = rule.getConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.keywords).toEqual(['test']);
      expect(config.tag).toBe('LEARNING');
    });
  });

  describe('updateConfig', () => {
    it('should update config', () => {
      const rule = createRule();
      
      rule.updateConfig({ enabled: false });
      expect(rule.getConfig().enabled).toBe(false);
      
      rule.updateConfig({ keywords: ['new', 'keywords'] });
      expect(rule.getConfig().keywords).toEqual(['new', 'keywords']);
    });
  });
});