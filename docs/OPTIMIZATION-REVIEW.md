# 优化评审（实现 / 性能 / 显示）

> 评审对象：`bilibili-focus-mode` v0.0.5（Manifest V3 + React 19 + Vite 8 + Tailwind v4）
> 结论：功能完整、测试覆盖不错（219 个单测），但**样式层是最大的结构性债务**，显示问题几乎都源于样式架构而不是某个组件写错。

---

## 0. 项目性质与设计定位

这是一个**行为约束工具**，不是内容消费产品：

- 核心闭环：全站拦截 → 待审池 → 审批（时段/配额/熔断码）→ 即时许可 → 债务 → 破产锁定。
- 用户 90% 的界面时间是 B 站视频页的拦截层与"是否值得看"的决策，而不是管理页的表格。
- 因此前端目标不是"信息密度"或"炫技"，而是：**低刺激、高可读、决策清晰、可信赖**。
- 设计方向据此定为「编辑式克制的专注台」：暖纸/深靛两套低饱和底色 + 单一信号色 + 衬线标题 + 等宽数字（详见 `docs/DESIGN-SYSTEM.md`）。

---

## 1. 显示问题：根因与状态

### 1.1 样式架构导致的"大面积丢样式"（已修复，P0）

旧实现同时存在两套主题机制：

1. Tailwind v4 在构建期按 `@theme` 生成工具类；
2. `ThemeService` 在运行期注入一整段 `!important` 类覆盖。

两者覆盖范围不一致，导致：

- `bg-accent-primary`（27 处）、`text-accent-primary`、`border-accent-primary`、`ring-accent-primary`、`bg-accent-hover`、`bg-accent-active`、`accent-text` **从未被任何一方定义** → 主按钮透明、激活标签无底色、白字白底不可见。
- `bg-success` 来自 Tailwind（`#22c55e`），`text-success` 被运行期改成主题色 → 同一个标签底色与文字色来自两套色板。
- 管理页/弹窗首帧没有主题（FOUC），因为主题在 React `useEffect` 里才注入。
- 弹窗（popup）根本没有初始化 `ThemeService`，`bg-accent-primary`、`bg-tertiary` 全部失效。

**修复**：

- 新增 `src/styles/tokens.css`：4 套静态调色板挂在 `html[data-fm-scheme][data-fm-mode]`，并用 `@theme` 桥接出 `--color-accent / success / warning / error / info / muted / on-accent`。
- 新增 `src/styles/base.css`：基础排版 + 历史语义类（`bg-primary`、`text-secondary`…）+ 组件原语（`fm-btn / fm-tabs / fm-card / fm-chip / fm-stat`）。
- `ThemeService` 改为单例，只切换 `<html>` 上的两个 data 属性；删除 `ThemeCSSGenerator` 与全部运行时 `!important` CSS。
- 三个入口（manager / popup / custom-homepage）在 `createRoot` 之前应用主题；`index.html` 预置默认 `data-fm-*` 与 `theme-color`，消除首帧闪烁。
- 全量清除 `bg-gray-800 / text-gray-400 / bg-blue-600 / text-green-400 ...` 原始色阶（约 100 处），统一到语义槽位；彩色实心按钮统一 `text-on-accent`。

### 1.2 无条件 CSS 覆盖（已修复，P0）

- `src/content/purify.css` 在**任何配置下**都隐藏 `#comment / .recommend-list / #danmakuBox`，导致"关闭简化后评论仍然消失"。
- `GlobalCSSGenerator.generate()` 无条件隐藏 `#bili-header-container > div`，导致全站头部导航消失。
- 两者已移除/改为配置驱动；对应单测同步更新为"不得无条件隐藏站点头部"。

### 1.3 拦截层把播放器永久隐藏（已修复，P0）

`BlockOverlayHost.applyHardBlock()` 给播放器写内联 `display:none` 并把 `video.currentTime = 0`，而 `remove()` 只卸载 React 根，**从不恢复**。结果：

- 点"加入待审池"/"每日放行"后拦截层消失，但页面永久黑屏；
- 每次权限复查都会把进度重置到 0。

**修复**：

- 记录被隐藏元素的原始 `display`，`remove()` 时恢复；
- 不再回退 `currentTime`，只暂停；
- 复查时复用同一个 React root（不再 unmount/remount），避免闪烁与重复暂停；
- 原生全屏时先 `exitFullscreen()`，否则拦截层在全屏元素之下不可见。

### 1.4 图片与占位（已修复，P0/P1）

- `VideoCover` 使用 `crossOrigin="anonymous"`：B 站 CDN 不保证 CORS 头，封面会加载失败显示"无封面"。改为 `referrerPolicy="no-referrer"` + `loading="lazy"` + `decoding="async"`。
- 专注首页用 `https://picsum.photos/seed/...` 做占位，随机网络图与产品气质冲突。改为本地 `public/cover-placeholder.svg`。

### 1.5 其它显示问题（已修复）

- `SearchBoxManager.mount()` 调 `remove()`，把刚注入的搜索页 `<style>` 立即删掉（只靠内联样式侥幸生效）。已拆分为 `unmountContent()` / `remove()`。
- 代码里直接写 `#ef4444 / #f59e0b / #10b981` 的进度条颜色与主题脱节，已改为 `var(--fm-*)`。
- `StatsDashboard` 的 `bg-secondary/50` 在没有 `--color-secondary` 时不会生成 → 行背景丢失，已改为 `bg-tertiary`。

### 1.6 仍需处理的显示风险

1. ~~**宽泛选择器误伤**~~：已移除 `[class*="ad-"]`、`[class*="hot"]`、`[id*="ad"]`、`[class*="comment"]`、`[class*="live-"]` 等通用子串选择器，改为显式站点类名清单（P0 完成）。
2. **主题增强的 `filter: invert(1)`**（`ThemeSyncService`）：整页反相是极重的合成操作，且图/视频需要二次反相，容易出现色偏、闪烁与性能问题。建议改为站点级深色样式或直接下线该开关（P1 待决策）。
3. **`CoverReplacementService`**：`MutationObserver` 监听 `document.body` 全量子树；且对新增节点只 `querySelector` 一次。建议按 `.bili-video-card` 批量查询 + `requestIdleCallback` 分批（P2）。
4. **原生全屏**：已做 `exitFullscreen`，但 B 站自定义"网页全屏"仍需实测；必要时把拦截层挂到播放器容器内（P1 实测）。

---

## 2. 实现问题

| 严重度 | 问题 | 位置 | 状态 |
| --- | --- | --- | --- |
| P0 | 播放器隐藏不可逆 / 进度清零 | `content/components/BlockOverlayHost.tsx` | 已修 |
| P0 | 运行时主题 CSS 与 Tailwind 工具类不一致 | `core/services/ThemeService.ts`、`css/ThemeCSSGenerator.ts` | 已修（删除生成器） |
| P0 | 无条件隐藏评论/头部 | `content/purify.css`、`css/GlobalCSSGenerator.ts` | 已修 |
| P1 | 跨视频导航时债务记到新视频 | `content/services/VideoTracker.ts` | 已修（独立 bvid + 切换前 flush） |
| P1 | 关闭债务追踪后重新开启会一次性补记整段时间 | `VideoTracker.sendDebtDelta` | 已修 |
| P1 | `SpeedController` 每次换视频泄漏 `MutationObserver`，且倍速 setter 捕获旧的 `speedMemoryEnabled` | `content/services/SpeedController.ts` | 已修（释放 + 动态判断 + 恢复原型访问器） |
| P1 | 每日配额用 UTC 日期导致中国时区 08:00 才重置 | `background/handlers/utils.ts`、`core/constants.ts` | 已修（本地日期键） |
| P1 | `handleUpdateDebt` 重复读取 storage/watchHistory | `background/handlers/debtHandlers.ts`、`watchHandlers.ts` | 已修（复用快照）；tag/title 仍由 watch-ended 补全 |
| P1 | 存储无统一 schema 校验/迁移（仅 `ensureStorageDefaults` 浅合并），导入备份缺少字段校验 | `background/handlers/utils.ts`、`manager/App.tsx` | 待修 |
| P2 | 组件内大量 `alert/confirm` | 多处 | 已修（Toast + ConfirmHost；导入备份保留原生确认） |
| P2 | 硬编码中文文案，无 i18n 层 | 全项目 | 待修 |
| P2 | emoji 作为图标 | 各组件 | 主要页面已替换为 `Icon`；配置子面板待清理 |
| P2 | `Popup` 无当前状态 | `popup/Popup.tsx` | 已修（待审/即时/债务/审批窗口 + 主题切换） |

---

## 3. 性能问题

| 严重度 | 问题 | 影响 | 状态 |
| --- | --- | --- | --- |
| P1 | 每次 SPA 导航：`checkHomepageRedirect` + `applyStyleSimplification` 各发一次 `get-full-config`，再发一次 `check-permission` | 每次导航 3 次后台往返 | 已修（`PermissionChecker` 30s 配置缓存 + `config` 变更失效） |
| P1 | 每次导航重建 `<style>` | 样式重算/闪烁 | 已修（`StyleInjector` 文本 diff） |
| P1 | 页面级 CSS 按分支各自 `injectPage`，离开路由后旧规则残留 | 规则堆积 | 已修（合并为一张表，空则移除） |
| P1 | 权限复查时卸载/重建拦截层 React 根 | 闪烁、重复暂停 | 已修（复用 root） |
| P1 | `SpeedController` observer 与属性补丁随视频切换累积 | 内存/CPU 持续增长 | 已修 |
| P1 | `handleUpdateDebt` 每分钟：`storage.local.get()` 全量 + 再读 `watchHistory` + 写 3 个 key | 播放页每分钟多次序列化/反序列化 | 待修（只读需要的 key；用增量日志/环形缓冲） |
| P1 | 多个 handler 用 `chrome.storage.local.get()` 全量读取 | 每次消息 O(全部数据) | 部分修复（债务/结束观看去掉二次读取）；其余待收敛 |
| P2 | manager `useStorage` 订阅全部 storage，任何写入（每分钟债务）都触发 App 重渲染 | 管理页常驻时每分钟整树 render | 待修（按字段订阅 / `useSyncExternalStore` + selector） |
| P2 | `CoverReplacementService` body 级 MutationObserver | 列表页高频回调 | 待修 |
| P2 | 搜索过滤每次变更全量扫描 `.bili-video-card` 并逐卡 `querySelector` | 无限滚动时线性增长 | 可接受，量大时用 IntersectionObserver |
| P2 | 历史记录 `[...watchHistory].sort()` 每次 render | 200 条内可接受 | 观察 |
| P3 | `ThemeSyncService` 的 `filter: invert` | GPU 合成开销 + 视觉破坏 | 建议下线 |

---

## 4. 架构建议（按项目性质）

1. **一个颜色源**：已完成。后续任何新颜色先加 token，再写组件；禁止 `#hex` 与原始色阶。
2. **内容脚本与页面样式解耦**：内容脚本只做"开关 → 生成规则"，不再长期持有大量内联样式；规则按路由合并、按配置 diff。
3. **决策层与展示层分离**：`PermissionService` / `DebtService` 保持纯函数（现状良好）；`background` 只做存储与编排；manager 组件不直接拼业务规则。
4. **可观测性**：为"拦截 → 审批 → 放行 → 债务"加一个轻量事件日志（已有 `BehaviorLoggingService`，但目前只用于熔断），便于自查"为什么今天被锁"。
5. **可访问性**：焦点环、`aria-selected`（标签页已加）、`role=switch`（主题开关已加）、对比度按 WCAG AA 校验；彩色面上只用 `--fm-accent-text`。
6. **本地化**：文案集中到 `src/i18n/`，先做 zh-CN 单语言，结构上为后续留口。

---

## 5. 路线图

### P0（已完成于本次改动）

- [x] 静态 token 体系 + Tailwind 桥接，修复缺失的 accent 工具类
- [x] 删除运行时 `!important` 主题注入，单例 `ThemeService`，消除 FOUC
- [x] popup / custom-homepage 主题启动
- [x] 播放器隐藏可逆 + 不复位进度 + 全屏退出 + root 复用
- [x] 移除无条件隐藏评论/头部
- [x] 封面 CORS 修复、picsum 替换、搜索框样式丢失修复
- [x] 配置缓存、样式 diff、路由样式合并、SpeedController/VideoTracker 修复

### P1（下一步）

1. ~~替换宽泛 CSS 选择器~~（已完成）；为每个简化开关补真实页面回归清单。
2. `ThemeSyncService` 决策：下线 `filter: invert`，或改为站点深色变量覆盖。
3. 后台存储访问继续收敛：其余 handler `getKeys` 化；`watchHistory` 用环形缓冲。
4. ~~修正每日配额时区~~（已完成）。
5. manager 按字段订阅 storage，拆分 `limbo/instant/permanent/stats` 四棵子树。
6. 加 Playwright 端到端：加载 `dist/`，验证"拦截 → 加池 → 审批 → 放行"与主题切换截图。

### P2（设计与体验）

1. emoji → 单线性图标（16/18px，`currentColor`）。
2. 配置页改为折叠分组卡片 + 行式开关，减少 16 个长面板的滚动疲劳。
3. Toast / Dialog 替代 `alert/confirm`；危险操作二次确认视觉化。
4. 列表图片尺寸约束 + 虚拟滚动（永久分组/历史 > 100 条时）。
5. popup 展示"当前债务 / 待审数 / 审批窗口倒计时"。
6. 自托管字体（仅扩展页），内容脚本继续用系统中文字体栈。

---

## 6. 验收

```bash
npm run typecheck   # 通过
npm run lint        # 通过
npm run test -- --run   # 219 passed
npm run build       # 通过
```

发布前人工检查（Chrome，加载 `dist/`）：

1. 管理页：浅色/深色 × 纸墨/夜幕 四组合，主按钮文字对比度、标签页激活态、封面图。
2. 弹窗：两套主题下按钮/边框/文字。
3. 专注首页：无封面视频显示本地占位图；卡片 hover。
4. B 站：视频页拦截 → 加入待审池 → 管理页批准 → 返回页面播放器恢复、进度不重置。
5. B 站：关闭"样式简化"后评论/推荐/头部仍可见。
6. 搜索页：自定义搜索框出现、原生头部隐藏、切走再切回不重复挂载。
