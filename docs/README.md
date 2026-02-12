# Bilibili Focus Mode - 开发文档

## 文档索引

- [技术栈参考](./tech-stack.md) - 技术选型、参考项目分析、依赖清单
- [架构设计](./architecture-design.md) - 完整的产品架构设计、数据模型、功能模块详设
- [项目架构](../ARCHITECTURE.md) - 项目目录结构、系统架构说明
- [AI 代理指南](../AGENTS.md) - 代码规范、命名约定、开发指南

## 快速导航

### 开发相关
- 技术栈: [tech-stack.md](./tech-stack.md)
- 架构设计: [architecture-design.md](./architecture-design.md)
- 构建配置: [tech-stack.md#23-关键构建配置](./tech-stack.md)

### 产品相关
- 四态许可系统: [architecture-design.md#13-架构概览](./architecture-design.md)
- 债务机制: [architecture-design.md#33-债务系统](./architecture-design.md)
- 熔断码系统: [architecture-design.md#32-熔断码系统](./architecture-design.md)

### 代码相关
- 代码规范: [../AGENTS.md](../AGENTS.md)
- 目录结构: [../ARCHITECTURE.md](../ARCHITECTURE.md)
- 类型定义: `src/core/types/index.ts`

## 开发流程

1. 阅读 [AGENTS.md](../AGENTS.md) 了解代码规范
2. 查看 [tech-stack.md](./tech-stack.md) 了解技术栈
3. 参考 [architecture-design.md](./architecture-design.md) 了解产品设计
4. 开始编码

## 测试

```bash
# 运行所有测试
npm run test

# 运行单个测试
npm run test -- src/core/services/PermissionService.test.ts
```

所有核心服务测试位于 `src/core/services/*.test.ts`
