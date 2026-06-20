# Bilibili Focus Mode - 开发文档

## 文档索引

- [项目架构](./ARCHITECTURE.md) - 项目目录结构、系统架构说明
- [GitHub Actions 指南](./github-action.md) - CI / 发布流程
- [AI 代理指南](../AGENTS.md) - 代码规范、命名约定、开发指南

## 快速导航

### 开发相关
- 架构说明: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 构建/测试命令: [README.md#-快速开始](../README.md#-快速开始)
- CI 与发布: [github-action.md](./github-action.md)

### 产品相关
- 四态许可系统: [ARCHITECTURE.md#核心业务流](./ARCHITECTURE.md#核心业务流)
- 债务机制: [ARCHITECTURE.md#核心服务层-coreservices](./ARCHITECTURE.md#核心服务层-coreservices)
- 熔断码系统: [ARCHITECTURE.md#核心服务层-coreservices](./ARCHITECTURE.md#核心服务层-coreservices)

### 代码相关
- 代码规范: [../AGENTS.md](../AGENTS.md)
- 目录结构: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 类型定义: `src/core/types/index.ts`

## 开发流程

1. 阅读 [AGENTS.md](../AGENTS.md) 了解代码规范
2. 查看 [ARCHITECTURE.md](./ARCHITECTURE.md) 了解当前代码结构
3. 查看 [github-action.md](./github-action.md) 了解 CI / 发布流程
4. 开始编码

## 测试

```bash
# 运行所有测试
npm run test

# 运行单个测试
npm run test -- src/test/unit/core/services/PermissionService.test.ts
```

核心服务单元测试位于 `src/test/unit/core/services/*.test.ts`
