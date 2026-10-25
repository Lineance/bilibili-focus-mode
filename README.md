# Bilibili Focus Mode

Bilibili Focus Mode 是一个基于白名单（Block-All-Except）的 Chrome 扩展，用于减少冲动观看，让每次访问都需要明确意图。

当前版本将权限流程收敛为两类：**永久放行规则**和**每日全量放行**。不再使用待审池、即时许可、熔断码或审批时间窗口。

## 功能特性

- **默认阻断**：未命中放行规则的视频会被阻断。
- **直接永久放行**：在阻断页选择 Tag 后，视频立即加入永久分组。
- **关键词自动放行**：标题命中关键词后自动放行，并按 Tag 参与债务计算。
- **UP 主白名单**：可信 UP 主的视频自动放行，并保留对应 Tag。
- **每日全量放行**：默认每天 3 次，每次 30 分钟，临时放行所有普通视频。
- **Tag 分类**：支持学习、娱乐、音乐三类 Tag。
- **债务与统计**：娱乐视频产生债务，学习视频偿还债务；统计面板保留今日、本周、本月观看数据。
- **页面专注功能**：保留首页、搜索、动态、直播和播放器的页面简化，以及外观、直播和播放器增强。
- **数据备份**：支持导出和导入关键词、UP 主、永久分组、债务和观看记录。
- **固定界面样式**：移除主题切换和主题管理，使用单一固定配色。

## 快速开始

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 加载扩展

1. 运行 `npm run build`。
2. 打开 Chrome `chrome://extensions/`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择项目下的 `dist/` 文件夹。

## 测试

```bash
npm run typecheck
npm run lint
npm run test -- --run
npm run build
```

## 发布

扩展版本由 `package.json`、`package-lock.json` 和 `src/manifest.json` 共同维护，三者必须保持一致。

主分支发布扩展时，更新版本后创建并推送对应标签：

```bash
git tag v0.0.6
git push origin main
git push origin v0.0.6
```

推送 `vX.Y.Z` 标签后，GitHub Actions 会自动执行：

- GitHub workflow 和打包脚本检查
- TypeScript 类型检查
- ESLint
- Vitest 单元测试
- Vite 生产构建
- 扩展 ZIP 打包与版本校验
- GitHub Release 创建和 SHA-256 校验清单上传

Windows Native Monitor 使用独立的 `monitor-vX.Y.Z` 标签和 Cargo 版本号，不要求与扩展版本相同。完整流程见 [GitHub Actions 指南](./docs/github-action.md)。

## 项目结构

```text
src/
├── background/        # MV3 Service Worker、权限处理和 Native Messaging
├── content/           # Bilibili 内容脚本、阻断层和页面简化
├── manager/           # 管理页：永久分组、关键词、UP 主、统计和配置
├── custom-homepage/   # 自定义专注首页
├── popup/             # 浏览器弹出窗口
├── core/              # 权限、债务、配置和统计核心逻辑
├── hooks/             # React Hooks
└── manifest.json      # Chrome 扩展清单
```

## 文档

- [开发文档索引](./docs/README.md)
- [架构文档](./docs/ARCHITECTURE.md)
- [设计系统](./docs/DESIGN-SYSTEM.md)
- [优化评审](./docs/OPTIMIZATION-REVIEW.md)
- [GitHub Actions 指南](./docs/github-action.md)
- [Windows 桌面体验](./docs/windows-desktop-experience.md)
- [监控程序使用说明](./chromium-extension-monitor/README.md)
- [AI 代理指南](./AGENTS.md)

## 技术栈

- React + TypeScript
- Vite + `@crxjs/vite-plugin`
- Tailwind CSS
- `webext-bridge`
- Vitest

## 致谢

项目中的外观增强、直播增强和播放器增强组件部分迁移自 [Bilibili-Evolved](https://github.com/the1812/Bilibili-Evolved)。

## 许可证

MIT
