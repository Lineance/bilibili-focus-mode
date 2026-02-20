import type { PermissionResult, VideoTag } from '@core/types';

/**
 * 检查上下文 - 包含视频的所有元数据
 * 未来可以扩展更多字段：description, tags, duration, viewCount 等
 */
export interface CheckContext {
  bvid: string;
  title: string;
  uploader: string;
  coverUrl?: string;
  // 未来扩展字段：
  // description?: string;
  // tags?: string[];
  // duration?: number;  // 视频时长（秒）
  // viewCount?: number;
  // likeCount?: number;
  // publishTime?: number;
}

/**
 * 智能权限检查器接口
 * 用于未来接入AI模型进行智能视频分类和权限判断
 * 
 * 实现示例：
 * - OpenAIService: 调用 OpenAI API 进行视频内容分析
 * - LocalAIService: 调用本地模型（如 llama.cpp, ollama）
 * - HybridService: 结合多个AI服务的结果
 */
export interface SmartPermissionChecker {
  /**
   * 检查视频权限
   * @param context 视频上下文信息
   * @returns 权限检查结果
   */
  check(context: CheckContext): Promise<PermissionResult>;
  
  /**
   * 获取AI服务的置信度
   * 用于判断AI结果的可靠性
   */
  getConfidence?(): number;
  
  /**
   * 获取AI分类建议
   * 返回AI建议的视频标签和理由
   */
  classify?(context: CheckContext): Promise<{
    tag: VideoTag;
    confidence: number;
    reason: string;
  }>;
}

/**
 * AI检查结果
 */
export interface AICheckResult {
  allowed: boolean;
  confidence: number;        // 置信度 0-1
  category: VideoTag;        // AI判断的分类
  reason: string;            // AI给出的理由
  metadata?: Record<string, unknown>;  // 额外的元数据
}

/**
 * AI服务配置
 */
export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  apiKey?: string;
  endpoint?: string;         // 自定义API端点
  model?: string;            // 模型名称
  minConfidence: number;     // 最低置信度阈值
  timeoutMs: number;         // 超时时间
  cacheResults: boolean;     // 是否缓存结果
  maxRetries?: number;       // 最大重试次数
}

/**
 * 抽象基类 - 用于实现具体的AI服务
 * 
 * 使用示例：
 * ```typescript
 * class OpenAIService extends BaseAIService {
 *   async analyze(title: string, description?: string): Promise<AICheckResult> {
 *     // 调用 OpenAI API
 *   }
 * }
 * 
 * class LocalAIService extends BaseAIService {
 *   async analyze(title: string, description?: string): Promise<AICheckResult> {
 *     // 调用本地模型
 *   }
 * }
 * ```
 */
export abstract class BaseAIService implements SmartPermissionChecker {
  constructor(protected config: AIServiceConfig) {}

  abstract check(context: CheckContext): Promise<PermissionResult>;

  protected buildPrompt(title: string, description?: string): string {
    return `
请分析以下B站视频标题，判断它是"学习类"还是"娱乐类"视频。

标题：${title}
${description ? `简介：${description}` : ''}

请按以下JSON格式返回：
{
  "category": "LEARNING" | "ENTERTAINMENT",
  "confidence": 0.0-1.0,
  "reason": "简要说明判断理由"
}
    `.trim();
  }

  protected parseResponse(response: string): AICheckResult {
    try {
      const parsed = JSON.parse(response);
      return {
        allowed: parsed.category === 'LEARNING',
        confidence: parsed.confidence,
        category: parsed.category,
        reason: parsed.reason,
      };
    } catch {
      // 解析失败时返回默认结果
      return {
        allowed: false,
        confidence: 0,
        category: 'ENTERTAINMENT',
        reason: '解析失败',
      };
    }
  }
}