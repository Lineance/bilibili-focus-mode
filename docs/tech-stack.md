我来搜索相关的开源项目作为技术参考，并确定具体的技术栈实现方案。
基于搜索结果，以下是**参考项目分析**与**推荐技术栈**：

---

## 1. 参考项目分析

### 1.1 直接相关项目

| 项目 | 技术栈 | 特点 | 借鉴点 |
|------|--------|------|--------|
| **Bilibili Focus Mode** | 原生 JS + Manifest V3 | 仅隐藏推荐/评论，无时间管理功能 | 基础净化CSS选择器参考 |
| **Easy Website Blocker** | React + TS + Vite + Tailwind + shadcn/ui | 使用`declarativeNetRequest`拦截，支持例外页面 | 现代UI组件库使用方式 |
| **chrome-ext-starter** | Vue 3 + Vite + webext-bridge | HMR热更新，跨上下文通信封装 | **通信层架构**（推荐参考） |
| **chrome-extension-boilerplate-react-vite** | React 18 + Vite 5 + CRXJS | 最活跃的React模板，支持Content Script HMR | **构建配置**（强烈推荐） |

### 1.2 关键技术验证

**Content Script 稳定性**：
- 问题：SPA页面（B站）切换路由时Content Script可能失效
- 解决：使用`MutationObserver` + `chrome.runtime.onMessage`双重保障

**CSP策略**：
- Manifest V3严格CSP，禁止`eval`和inline script
- 使用Vite构建时需配置`build.rollupOptions.output.inlineDynamicImports: false`

**存储通信**：
- Content Script与Background通信必须是异步（`chrome.storage`或`postMessage`）
- 无同步存储方案，需设计加载状态避免UI闪烁

---

## 2. 推荐技术栈

### 2.1 核心架构

```yaml
构建工具: Vite 5 + Rollup（比Webpack快10倍，HMR支持）
前端框架: React 18 + TypeScript 5（严格模式）
UI组件: Tailwind CSS 3.4 + shadcn/ui（或Radix UI）
状态管理: Zustand（轻量，跨Context共享）
通信层: webext-bridge（封装postMessage，类型安全）
存储封装: idb-keyval（IndexedDB Promise封装，chrome.storage备选）
构建插件: @crxjs/vite-plugin（处理Manifest，支持Content Script HMR）
测试: Vitest（单元）+ Playwright（E2E）
```

### 2.2 目录结构（基于CRXJS最佳实践）

```text
bilibili-focus-mode/
├── src/
│   ├── background/              # Service Worker (MV3)
│   │   ├── index.ts             # 入口，监听alarms/install
│   │   ├── storageMigrator.ts   # 版本迁移
│   │   └── debtCalculator.ts    # 债务计算后台任务
│   │
│   ├── content/                 # Content Scripts (注入B站)
│   │   ├── index.tsx            # 入口，判定页面类型
│   │   ├── purifier.ts          # 净化逻辑（移除评论/推荐）
│   │   ├── blocker.tsx          # Block Overlay (React Portal)
│   │   ├── debtTracker.ts       # 播放器监听，债务追踪
│   │   └── glasswall.ts         # 首页玻璃墙（如保留）
│   │
│   ├── manager/                 # 独立管理页 (Options Page)
│   │   ├── index.html
│   │   ├── main.tsx             # React挂载点
│   │   ├── App.tsx              # 路由/布局
│   │   ├── components/
│   │   │   ├── LimboReview.tsx  # 待审池审查
│   │   │   ├── ListManager.tsx  # 三列表管理
│   │   │   ├── DebtDashboard.tsx# 债务仪表盘
│   │   │   └── ConfigPanel.tsx  # 配置中心
│   │   └── hooks/
│   │       ├── useStorage.ts    # 封装chrome.storage
│   │       └── usePermission.ts # 权限检查
│   │
│   ├── popup/                   # 可选：快速添加Popup
│   │   └── index.tsx            # 简单状态显示/快捷入口
│   │
│   ├── core/                    # 纯逻辑层（可单元测试）
│   │   ├── conditions/          # 条件链策略
│   │   ├── services/
│   │   │   ├── PermissionService.ts
│   │   │   └── ExpirationService.ts
│   │   └── types/               # 全项目类型定义
│   │
│   └── manifest.json            # 入口配置，CRXJS处理
│
├── public/                      # 静态资源
├── vitest.config.ts             # 测试配置
└── vite.config.ts               # 关键构建配置
```

### 2.3 关键构建配置 (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),  // 自动生成MV3配置，处理Content Script注入
  ],
  build: {
    rollupOptions: {
      output: {
        // 避免CSP问题，不生成内联脚本
        inlineDynamicImports: false,
      },
    },
  },
  // 解决Content Script HMR在B站域下的问题
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
  },
});
```

---

## 3. 核心技术实现细节

### 3.1 跨上下文通信（基于webext-bridge）

```typescript
// 定义消息协议（类型安全）
// src/core/protocol.ts
export interface ProtocolMap {
  'check-permission': { 
    req: { bvid: string }; 
    res: { allowed: boolean; reasons: string[] }; 
  };
  'add-to-limbo': {
    req: { metadata: VideoMetadata };
    res: { success: boolean; limboCount: number };
  };
  'update-debt': {
    req: { minutes: number; type: 'accrue' | 'repay' };
    res: { currentDebt: number };
  };
}

// Background 监听
// src/background/index.ts
import { onMessage } from 'webext-bridge/background';

onMessage('check-permission', async ({ data }) => {
  const service = new PermissionService();
  return service.check(data.bvid);
});

// Content Script 调用
// src/content/blocker.ts
import { sendMessage } from 'webext-bridge/content-script';

const result = await sendMessage('check-permission', { bvid: 'BV1xx' });
if (!result.allowed) showBlockOverlay(result.reasons);
```

### 3.2 存储层封装（支持Reactive）

```typescript
// src/hooks/useStorage.ts
import { useSyncExternalStore } from 'react';
import { storage } from '@core/adapters/ChromeStorageAdapter';

export function useStorage<T>(key: string, defaultValue: T) {
  return useSyncExternalStore(
    (callback) => storage.subscribe(key, callback),
    () => storage.get(key) ?? defaultValue,
  );
}

// 使用示例
const coolingList = useStorage('coolingList', []);
```

### 3.3 内容脚本注入时机（防闪烁）

```typescript
// src/manifest.json (CRXJS处理)
{
  "content_scripts": [
    {
      "matches": ["https://*.bilibili.com/video/*"],
      "js": ["src/content/index.tsx"],
      "css": ["src/content/purify.css"],  // 关键：CSS先注入
      "run_at": "document_start"          // 关键：尽早执行
    }
  ]
}
```

**purify.css**（立即隐藏，防止DOM加载闪烁）：
```css
#comment, .reply-wrapper, .recommend-list, 
.next-play, .related-video, #danmakuBox {
  display: none !important;
  visibility: hidden !important;
}
```

---

## 4. 开发工作流

### 4.1 本地开发
```bash
# 安装
npm install

# 开发模式（支持Content Script HMR）
npm run dev

# 加载扩展
# 1. 打开 chrome://extensions/
# 2. 开启 Developer mode
# 3. Load unpacked -> 选择 dist/ 文件夹
# 4. 修改代码后自动刷新，无需手动reload
```

### 4.2 生产构建
```bash
npm run build
# 生成 dist/ 文件夹，直接上传Chrome Web Store
```

### 4.3 测试策略
```bash
# 单元测试（core层纯逻辑）
npm run test:unit

# E2E测试（Puppeteer模拟B站环境）
npm run test:e2e
```

---

## 5. 依赖清单（package.json关键项）

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",           // 状态管理
    "webext-bridge": "^6.0.1",     // 跨上下文通信
    "idb-keyval": "^6.2.1",        // IndexedDB（大容量存储备选）
    "date-fns": "^2.30.0"          // 时间计算（跨天逻辑）
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.19",  // 关键：CRXJS插件
    "@types/chrome": "^0.0.246",   // Chrome API类型
    "@types/react": "^18.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 6. 立即启动命令

```bash
# 使用推荐模板初始化（基于CRXJS React）
npx degit https://github.com/ThomasKiljanczykDev/Chrome-Extension-Boilerplate-React-Vite.git bilibili-focus-mode
cd bilibili-focus-mode
npm install

# 或从零创建（更干净）
mkdir bilibili-focus-mode && cd bilibili-focus-mode
npm init -y
npm install react react-dom zustand webext-bridge
npm install -D @crxjs/vite-plugin vite @types/chrome typescript tailwindcss postcss autoprefixer
```

**推荐**：基于**CRXJS React Boilerplate**初始化，已配置好HMR和Content Script注入，可直接开始业务逻辑开发。

确认此技术栈后，可立即开始编写`manifest.json`和核心Storage接口。