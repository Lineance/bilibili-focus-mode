# 项目架构文档

## 概述

Bilibili Focus Mode 是一个基于 Manifest V3 的 Chrome 扩展，采用现代化的前端技术栈构建。

## 系统架构

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Background  │   Content    │   Manager    │     Popup      │
│  (Service    │   Script     │  (Options)   │                │
│   Worker)    │              │              │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                          │
                    ┌─────────────┐
                    │  Core Layer │
                    │  (Services) │
                    └─────────────┘
```

### 1. Background (Service Worker)

- **职责**: 后台任务、定时提醒、跨页面通信
- **关键功能**:
  - 权限检查
  - 债务计算
  - 定时提醒（Limbo 审查）
  - 存储管理

### 2. Content Script

- **职责**: 注入 Bilibili 播放页，拦截和净化
- **关键功能**:
  - 页面净化（移除评论/推荐）
  - 权限检查
  - Block Overlay 显示
  - 视频元数据提取

### 3. Manager (Options Page)

- **职责**: 管理界面，React 应用
- **关键功能**:
  - Limbo 审查
  - 列表管理
  - 债务仪表盘
  - 配置中心

### 4. Popup

- **职责**: 快速操作入口
- **关键功能**:
  - 打开管理页
  - 快速状态查看

### 5. Core Layer

- **职责**: 纯业务逻辑，可单元测试
- **服务**:
  - `PermissionService` - 权限检查
  - `FuseService` - 熔断码生成与验证
  - `DebtService` - 债务计算
  - `ExpirationService` - 过期管理

## 数据流

```
用户点击视频
    ↓
Content Script 提取元数据
    ↓
发送消息到 Background
    ↓
PermissionService 检查权限
    ↓
返回结果到 Content Script
    ↓
允许播放 / 显示 Block Overlay
```

## 存储结构

```typescript
interface ExtensionStorage {
  version: 3;
  limboList: LimboItem[];           // 待审池
  coolingList: CoolingItem[];       // 冷静期
  instantList: InstantItem[];       // 即时许可
  permanentGroups: PermanentGroup[]; // 永久分组
  ghostList: GhostItem[];           // 幽灵档案
  behaviorLog: BehaviorLog;         // 行为日志
  globalStats: GlobalStats;         // 全局统计
  debtAccount: DebtAccount;         // 债务账户
  config: ExtensionConfig;          // 配置
}
```

## 四态许可系统

```
用户发现视频
    ↓
加入 Limbo (待审池)
    ↓
审查决策
    ├─→ Cooling (24h冷静期 + 48h可用期)
    ├─→ Instant (6h有效，需熔断码)
    ├─→ Permanent (随时观看，偿还债务)
    └─→ Delete (删除)
    ↓
过期视频 → Ghost (7天招魂期)
```

## 债务系统

- **产生债务**: 观看 Entertainment 视频 (+2 分钟/分钟)
- **偿还债务**: 观看 Learning 视频 (-1 分钟/分钟)
- **破产阈值**: 60 分钟
- **破产惩罚**: 24小时禁止新申请

## 熔断码系统

动态长度算法：
- 基础长度: 8 位
- 1次申请后10分钟内: 16 位
- 2次申请: 32 位
- 3次及以上: 64 位
- 破产绕过: 64-128 位

## 通信机制

使用 `webext-bridge` 进行类型安全的跨上下文通信：

```typescript
// Content → Background
const result = await sendMessage('check-permission', { bvid });

// Background 处理
onMessage('check-permission', async (message) => {
  const data = message.data as ProtocolMap['check-permission']['req'];
  return service.check(data.bvid);
});
```

## 目录结构

```
src/
├── background/
│   └── index.ts              # Service Worker 入口
├── content/
│   ├── index.tsx             # Content Script 入口
│   └── purify.css            # 净化样式
├── manager/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/           # 管理页组件
│   └── hooks/                # 管理页 Hooks
├── popup/
│   ├── index.html
│   ├── index.tsx
│   └── index.css
├── core/
│   ├── services/             # 业务服务
│   │   ├── PermissionService.ts
│   │   ├── FuseService.ts
│   │   ├── DebtService.ts
│   │   ├── ExpirationService.ts
│   │   └── *.test.ts         # 单元测试
│   ├── types/
│   │   └── index.ts          # 类型定义
│   ├── protocol.ts           # 消息协议
│   └── constants.ts          # 默认配置
├── hooks/
│   ├── useStorage.ts
│   ├── usePermission.ts
│   └── useFuseCode.ts
├── components/               # 共享组件
├── adapters/                 # 存储适配器
└── manifest.json             # 扩展配置
```

## 开发规范

1. **TypeScript**: 严格模式，显式返回类型
2. **命名**: PascalCase(组件), camelCase(hooks/函数)
3. **测试**: 核心逻辑必须包含单元测试
4. **错误处理**: 使用自定义错误类，不静默吞错
5. **导入顺序**: React → 核心 → Hooks → 组件 → 工具 → 样式

## 构建配置

### Vite 配置要点

```typescript
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: false, // CSP 合规
      },
    },
  },
});
```

### CSP 合规

- 禁止内联脚本
- 禁止 `eval()`
- CSS 在 `document_start` 注入

## 测试策略

- **单元测试**: 覆盖 `core/services/` 所有服务
- **测试框架**: Vitest
- **覆盖率**: 核心逻辑 100% 覆盖

## 已知限制

1. **状态不同步**: Content Script 内存缓存与 Storage 修改不同步（页面刷新后同步）
2. **软锁绕过**: 技术用户可通过禁用扩展绕过（依赖自律）
3. **封面 URL 失效**: B站 CDN 链接可能 404

## 路线图

### Phase 2
- [ ] 合集批量添加
- [ ] CSV 导出增强
- [ ] 保质期可视化

### Phase 3
- [ ] 全局快捷键
- [ ] New Tab 看板
- [ ] Streak 系统
