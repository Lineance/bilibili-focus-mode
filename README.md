# Bilibili Focus Mode

基于白名单（Block-All-Except）的深度时间管理 Chrome 扩展，采用四态许可系统（Limbo → Cooling → Instant → Permanent）结合债务机制，实现"意图性娱乐"（Intentioned Entertainment）。

## ✨ 功能特性

- **四态许可系统**: Limbo(待审池) → Cooling(冷静期) → Instant(即时许可) → Permanent(永久分组)
- **债务机制**: 观看娱乐视频产生债务，学习视频偿还债务
- **熔断码系统**: 动态长度熔断码防止疲劳绕过
- **幽灵档案**: 过期视频可招魂复活
- **破产惩罚**: 债务过高触发24小时锁定
- **关键词自动放行**: 基于标题关键词自动识别学习视频并放行
- **数据备份**: 支持导出/导入所有数据，包括关键词规则

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

- **React + TypeScript** - 前端框架
- **Vite + @crxjs/vite-plugin** - Chrome 扩展构建工具链
- **Tailwind CSS** - 样式系统
- **webext-bridge** - 跨上下文通信
- **Vitest** - 单元测试

## 📁 项目结构

```
src/
├── background/        # Service Worker (MV3)
├── content/           # Content Scripts (注入B站)
│   ├── components/    # 拦截层 UI 组件
│   └── services/      # 页面检测、样式注入、权限检查等
├── manager/           # 管理页 (Options Page)
│   └── components/    # 配置、债务、审查等管理组件
├── popup/             # 弹出窗口
├── core/              # 纯逻辑层
│   ├── services/      # 业务逻辑服务
│   ├── types/         # TypeScript 类型定义
│   └── constants.ts   # 默认配置
├── test/              # 单元/集成/E2E 测试
├── hooks/             # React Hooks
└── manifest.json      # 扩展配置
```

## 📚 文档

- [开发文档索引](./docs/README.md) - 文档导航入口
- [架构文档](./docs/ARCHITECTURE.md) - 当前代码结构与模块职责
- [GitHub Actions 指南](./docs/github-action.md) - CI / Release 使用说明
- [AI 代理指南](./AGENTS.md) - 开发规范与指南

## 🧪 测试

```bash
# 运行所有测试
npm run test

# 运行单个测试文件
npm run test -- src/test/unit/core/services/PermissionService.test.ts

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
