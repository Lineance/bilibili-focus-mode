import { describe, it, expect } from 'vitest';
import {
  BaseAIService,
  type CheckContext,
  type AIServiceConfig,
  type AICheckResult,
} from './SmartPermissionChecker';
import type { PermissionResult } from '@core/types';

// Mock implementation for testing
class MockAIService extends BaseAIService {
  constructor(config: AIServiceConfig) {
    super(config);
  }

  async check(context: CheckContext): Promise<PermissionResult> {
    const result = await this.analyze(context.title);
    return {
      allowed: result.allowed,
      reason: result.reason,
    };
  }

  private async analyze(title: string): Promise<AICheckResult> {
    // Simple mock logic for testing
    if (title.includes('教程') || title.includes('学习')) {
      return {
        allowed: true,
        confidence: 0.9,
        category: 'LEARNING',
        reason: '包含学习关键词',
      };
    }
    return {
      allowed: false,
      confidence: 0.8,
      category: 'ENTERTAINMENT',
      reason: '娱乐内容',
    };
  }
}

describe('SmartPermissionChecker', () => {
  describe('BaseAIService', () => {
    const mockConfig: AIServiceConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
      minConfidence: 0.7,
      timeoutMs: 5000,
      cacheResults: true,
      maxRetries: 3,
    };

    it('should create service with config', () => {
      const service = new MockAIService(mockConfig);
      expect(service).toBeDefined();
    });

    it('should build prompt correctly', () => {
      const service = new MockAIService(mockConfig);
      const prompt = (service as any).buildPrompt('测试标题', '测试描述');
      
      expect(prompt).toContain('测试标题');
      expect(prompt).toContain('测试描述');
      expect(prompt).toContain('LEARNING');
      expect(prompt).toContain('ENTERTAINMENT');
    });

    it('should build prompt without description', () => {
      const service = new MockAIService(mockConfig);
      const prompt = (service as any).buildPrompt('测试标题');
      
      expect(prompt).toContain('测试标题');
      expect(prompt).not.toContain('简介：');
    });

    it('should parse valid JSON response', () => {
      const service = new MockAIService(mockConfig);
      const response = JSON.stringify({
        category: 'LEARNING',
        confidence: 0.95,
        reason: '这是一个学习视频',
      });
      
      const result = (service as any).parseResponse(response);
      
      expect(result.allowed).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.category).toBe('LEARNING');
      expect(result.reason).toBe('这是一个学习视频');
    });

    it('should handle invalid JSON response', () => {
      const service = new MockAIService(mockConfig);
      const response = 'invalid json';
      
      const result = (service as any).parseResponse(response);
      
      expect(result.allowed).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.category).toBe('ENTERTAINMENT');
      expect(result.reason).toBe('解析失败');
    });

    it('should handle missing fields in response', () => {
      const service = new MockAIService(mockConfig);
      const response = JSON.stringify({
        category: 'ENTERTAINMENT',
        confidence: 0.5,
      });
      
      const result = (service as any).parseResponse(response);
      
      expect(result.allowed).toBe(false);
      expect(result.confidence).toBe(0.5);
      expect(result.category).toBe('ENTERTAINMENT');
      expect(result.reason).toBeUndefined();
    });
  });

  describe('MockAIService', () => {
    const mockConfig: AIServiceConfig = {
      provider: 'openai',
      minConfidence: 0.7,
      timeoutMs: 5000,
      cacheResults: false,
    };

    it('should allow learning videos', async () => {
      const service = new MockAIService(mockConfig);
      const context: CheckContext = {
        bvid: 'BV1xx',
        title: 'Python教程',
        uploader: 'Test',
      };
      
      const result = await service.check(context);
      
      expect(result.allowed).toBe(true);
    });

    it('should deny entertainment videos', async () => {
      const service = new MockAIService(mockConfig);
      const context: CheckContext = {
        bvid: 'BV1yy',
        title: '搞笑视频',
        uploader: 'Test',
      };
      
      const result = await service.check(context);
      
      expect(result.allowed).toBe(false);
    });

    it('should handle context with optional fields', async () => {
      const service = new MockAIService(mockConfig);
      const context: CheckContext = {
        bvid: 'BV1zz',
        title: '学习笔记',
        uploader: 'Test',
        coverUrl: 'https://example.com/cover.jpg',
      };
      
      const result = await service.check(context);
      
      expect(result).toBeDefined();
      expect(result.reason).toBeDefined();
    });
  });

  describe('AIServiceConfig', () => {
    it('should accept all provider types', () => {
      const providers: Array<'openai' | 'anthropic' | 'local' | 'custom'> = [
        'openai',
        'anthropic',
        'local',
        'custom',
      ];
      
      providers.forEach((provider) => {
        const config: AIServiceConfig = {
          provider,
          minConfidence: 0.7,
          timeoutMs: 5000,
          cacheResults: false,
        };
        
        const service = new MockAIService(config);
        expect(service).toBeDefined();
      });
    });

    it('should handle optional config fields', () => {
      const config: AIServiceConfig = {
        provider: 'custom',
        endpoint: 'https://custom-api.com',
        model: 'custom-model',
        apiKey: 'custom-key',
        maxRetries: 5,
        minConfidence: 0.8,
        timeoutMs: 10000,
        cacheResults: true,
      };
      
      const service = new MockAIService(config);
      expect(service).toBeDefined();
    });
  });
});
