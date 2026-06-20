# 项目架构文档（当前实现）

## 概述

Bilibili Focus Mode 是一个基于 Manifest V3 的 Chrome 扩展。项目采用「前后台分层 + 核心服务层」架构，业务规则集中在 `src/core`，页面注入与交互分布在 `content / manager / popup / background`。

## 架构分层

### Background（Service Worker）

- 入口：`src/background/index.ts`
- 主要职责：
  - 注册消息处理器（`src/background/MessageHandlers.ts`）
  - 定时任务与提醒（`AlarmHandler`）
  - 数据迁移（`DebtMigrationService`）
  - 可选 Native Messaging 通道（`NativeMessagingClient`）

### Content Script（Bilibili 页面注入）

- 入口：`src/content/index.tsx`
- 主要职责：
  - 页面样式净化与注入（`StyleOrchestrator` / `StyleInjector`）
  - 视频元数据提取（`VideoMetadataExtractor`）
  - 权限检查编排（`PermissionOrchestrator` / `PermissionChecker`）
  - 拦截 UI（`components/BlockOverlay*`）
  - SPA 路由监听（`NavigationWatcher`）

### Manager（Options 管理页）

- 入口：`src/manager/main.tsx` + `src/manager/App.tsx`
- 主要职责：
  - 四态列表管理（Limbo / Cooling / Instant / Permanent / Ghost）
  - 债务看板、熔断申请、时段与配置面板
  - 主题与关键词规则设置

### Popup

- 入口：`src/popup/index.tsx`
- 主要职责：快速打开管理页与查看当前状态

### 核心服务层（`src/core/services`）

核心业务规则均为可测试的纯逻辑服务，典型服务如下：

- `PermissionService`：统一权限判定流程
- `DebtService`：债务累计与偿还规则
- `FuseService` / `FuseApplicationService`：熔断码生成与申请策略
- `ExpirationService` / `GhostResurrectionService`：过期与招魂流程
- `ConfigService` / `TimeWindowService`：配置与时段规则
- `KeywordRule`：关键词自动放行

## 核心业务流

### 视频访问判定

1. Content Script 提取视频元数据
2. 通过 `webext-bridge` 发消息到 Background
3. Background 调用 `PermissionService` 判定
4. 返回结果给 Content Script，决定放行或显示拦截层

### 四态许可流转

`Limbo → Cooling / Instant / Permanent → (过期) Ghost`

- `Cooling` 和 `Instant` 带时效性
- `Permanent` 为长期许可
- 过期条目由过期服务转入 `Ghost`

## 目录结构（精简）

```text
src/
├── background/             # Service Worker 与消息处理
├── content/                # 页面注入、拦截 UI、样式净化
│   ├── components/
│   └── services/
├── manager/                # 管理页 React 应用
│   ├── components/
│   └── hooks/
├── popup/                  # 扩展弹窗
├── core/                   # 核心业务逻辑（可测试）
│   ├── services/
│   ├── storage/
│   ├── types/
│   └── utils/
├── hooks/                  # 共享 Hooks
├── test/                   # 测试（unit / integration / e2e）
└── manifest.json
```

## 测试与质量保障

- 测试目录：`src/test/unit`, `src/test/integration`, `src/test/e2e`
- 常用校验命令：
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test -- --run`
