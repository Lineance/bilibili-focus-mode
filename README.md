# Bilibili Focus Mode

基于白名单（Block-All-Except）的深度时间管理 Chrome 扩展，采用四态许可系统（Limbo → Cooling → Instant → Permanent）结合债务机制，实现"意图性娱乐"（Intentioned Entertainment）。

## ✨ 功能特性

- **四态许可系统**: Limbo(待审池) → Cooling(冷静期) → Instant(即时许可) → Permanent(永久分组)
- **债务机制**: 观看娱乐视频产生债务，学习视频偿还债务
- **熔断码系统**: 动态长度熔断码防止疲劳绕过
- **幽灵档案**: 过期视频可招魂复活
- **破产惩罚**: 债务过高触发24小时锁定

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式（支持 HMR）
npm run dev

# 构建生产版本
npm run build
```

## 📦 加载扩展

1. 运行 `npm run build`
2. 打开 Chrome `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `dist/` 文件夹

## 🛠️ 技术栈

- **React 18** + **TypeScript 5** - 前端框架
- **Vite 6** + **@crxjs/vite-plugin** - 构建工具
- **Tailwind CSS 3.4** - 样式框架
- **Zustand** - 状态管理
- **webext-bridge** - 跨上下文通信
- **Vitest** - 单元测试

## 📁 项目结构

```
src/
├── background/        # Service Worker (MV3)
├── content/           # Content Scripts (注入B站)
├── manager/           # 管理页 (Options Page)
├── popup/             # 弹出窗口
├── core/              # 纯逻辑层
│   ├── services/      # 业务逻辑服务
│   ├── types/         # TypeScript 类型定义
│   └── constants.ts   # 默认配置
├── hooks/             # React Hooks
└── manifest.json      # 扩展配置
```

## 📚 文档

- [技术栈参考](./docs/tech-stack.md) - 技术选型与参考项目
- [架构设计](./docs/architecture-design.md) - 完整架构设计文档
- [架构文档](./ARCHITECTURE.md) - 项目架构说明
- [AI 代理指南](./AGENTS.md) - 开发规范与指南

## 🧪 测试

```bash
# 运行所有测试
npm run test

# 运行单个测试文件
npm run test -- src/core/services/PermissionService.test.ts

# 测试覆盖率
npm run test:coverage
```

## 📝 开发规范

- 使用 TypeScript 严格模式
- 组件使用 PascalCase，hooks 使用 camelCase
- 所有核心逻辑必须包含单元测试
- 遵循 AGENTS.md 中的代码规范

## 📄 许可证

MIT
