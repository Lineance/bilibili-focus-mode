# 设计系统（Design System）

> 目标：让扩展的三个界面（管理页 / 弹窗 / 专注首页）与 B 站页面内的拦截层看起来是**同一个产品**，并且所有颜色只有一个来源。

## 1. 设计原则

| 原则 | 说明 |
| --- | --- |
| 克制（Restrained） | 这是一个"帮助你少看"的工具，界面不应比 B 站更好玩。强调色只用于**决策点**（主操作、当前选中、债务告警），占比目标 ≤ 10%。 |
| 编辑感（Editorial） | 标题用衬线字体、数字用等宽字体、标签用大写小字距，做出"阅读物"而非"仪表盘模板"的质感。 |
| 语义色（Semantic） | 颜色只表达含义：学习=玉绿、娱乐=琥珀、音乐=青蓝、风险=朱砂/珊瑚。**不做纯装饰性上色**。 |
| 深浅一致 | 浅色不是深色反相，而是独立调过的暖纸/冷纸方案；两套主题共用同一套语义槽位。 |
| 一次只强调一件事 | 一个视图里最多一个主按钮（实心强调色），其余为描边/幽灵按钮。 |

## 2. Token 架构

```
src/styles/tokens.css
  ├─ 字体 / 圆角 / 阴影尺度
  ├─ 4 套调色板（scheme × mode），挂在 html[data-fm-scheme][data-fm-mode]
  └─ @theme 桥接：--color-accent / --color-success ... → Tailwind 工具类

src/styles/base.css
  ├─ 基础重置、排版、焦点环、滚动条、动效降级
  ├─ 历史语义类：bg-primary / text-secondary / border-secondary ...
  └─ 组件原语：fm-shell / fm-header / fm-tabs / fm-btn / fm-card / fm-chip / fm-stat

ThemeService（core/services/ThemeService.ts）
  └─ 只负责切换 <html> 上的两个 data 属性并持久化到 localStorage
```

**硬性约定**

1. 主题色只能通过 CSS 变量使用；**不允许**在组件里写十六进制颜色（进度条等也用 `var(--fm-*)`）。
2. 不允许再出现运行时生成 CSS 字符串 / `!important` 覆盖工具类。
3. 状态色只能来自 `success / warning / error / info` 四个语义槽位，不得直接用 `bg-green-600` 之类的 Tailwind 原始色阶（已全部迁移）。
4. 彩色实心背景上的文字统一用 `text-on-accent`（"彩色面上的墨色"），保证两套主题下都够对比度。

## 3. 调色板

### 3.1 夜幕 Tokyo（深靛 / 电光蓝）

| 槽位 | 深色 | 浅色 |
| --- | --- | --- |
| bg-primary | `#0A0D13` | `#F3F6FC` |
| bg-secondary | `#11161F` | `#FFFFFF` |
| bg-tertiary | `#171D28` | `#E9EEF8` |
| bg-hover | `#212A38` | `#DCE4F3` |
| text-primary | `#E8EDF7` | `#101625` |
| text-secondary | `#A6B2C6` | `#38435A` |
| text-tertiary | `#7B879E` | `#5D6980` |
| text-muted | `#5A657C` | `#8590A5` |
| border-secondary | `#232B3A` | `#C9D4E7` |
| accent-primary | `#7AA2F7` | `#2F5FBF` |
| accent-hover | `#9BBBFB` | `#254E9F` |
| accent-text | `#08101F` | `#FFFFFF` |
| success（学习） | `#5FD1A0` | `#1F7A52` |
| warning（娱乐） | `#E8B15C` | `#A6651B` |
| error（风险） | `#F0737B` | `#C23B48` |
| info（音乐） | `#7DD3FC` | `#166D9E` |

### 3.2 纸墨 Paper & Ink（暖纸 / 朱砂）

| 槽位 | 深色 | 浅色 |
| --- | --- | --- |
| bg-primary | `#14110E` | `#F6F2E9` |
| bg-secondary | `#1B1713` | `#FCF9F2` |
| bg-tertiary | `#241F19` | `#EEE7D8` |
| bg-hover | `#322A22` | `#E3DAC8` |
| text-primary | `#F0E8D9` | `#1A1714` |
| text-secondary | `#C6BBA6` | `#4A443B` |
| text-tertiary | `#968C7A` | `#766E60` |
| text-muted | `#6F6759` | `#9A9182` |
| border-secondary | `#2F2821` | `#D9CFBD` |
| accent-primary | `#E2704F` | `#B4442E` |
| accent-hover | `#F08A6A` | `#9C3724` |
| accent-text | `#171310` | `#FCF9F2` |
| success（学习） | `#86BE93` | `#3F6F4E` |
| warning（娱乐） | `#E0B45C` | `#A9741F` |
| error（风险） | `#EC7A6B` | `#B4442E` |
| info（音乐） | `#8FB6D6` | `#3B5C7A` |

> 旧实现同时存在 `#ef4444 / #f7768e / #dc3545`、`#10b981 / #9ece6a / #28a745`、`#00aeec / #00a1d6 / #7aa2f7` 等近似的"多套同义色"，正是"颜色相近但又不一致"的来源。现在每个语义只保留一个值。

## 4. 排版

| 用途 | 字体栈 | 说明 |
| --- | --- | --- |
| 正文 / UI | `--fm-font-sans`：思源黑体 / Noto Sans SC / PingFang SC / 微软雅黑 UI | 中文优先，避免英文 GIS 字体导致的字重跳变 |
| 标题 / 品牌字 | `--fm-font-display`：Iowan Old Style / Palatino / 宋体系 / Noto Serif SC | 只在 `h1 h2 h3`、品牌字使用，形成编辑感 |
| 数字 / 代码 / 熔断码 | `--fm-font-mono`：JetBrains Mono / SF Mono / Cascadia Mono | 统计数字必须 `tabular-nums`，避免跳动 |

尺度（管理页）：品牌 21px、页面标题 26px、区块标题 15-16px、正文 13-14px、辅助 11-12px。
`fm-label` 用于小标题：11px / 字距 0.16em / 全大写（中文不受影响）/ 三级文字色。

## 5. 间距、圆角、阴影、动效

- 间距基数 4px；区块内 12/16/20px，区块间 24/32px。
- 圆角：输入/按钮 10px，卡片 14px，弹层 18-20px，胶囊 999px。
- 阴影：`--fm-shadow-soft`（1px 接触阴影 + 大范围负扩散），不叠加多重彩色阴影。
- 动效：180–250ms，`ease`；只做颜色/位移/透明度，不做弹跳。`prefers-reduced-motion` 下全部降级为 0.01ms。
- 焦点：全局 `:focus-visible` 2px 强调色描边 + 2px offset，不使用 `outline:none`。

## 6. 共享 UI 组件（`src/ui`）

| 组件 | 用途 |
| --- | --- |
| `Button` / `IconButton` | 主/次/危险/幽灵按钮与图标按钮 |
| `Card` / `SectionHeader` / `PageIntro` | 页面与区块骨架 |
| `TagChip` / `StatusChip` | 视频标签与语义状态 |
| `Toggle` / `Field` | 设置行的开关与标签/说明布局 |
| `Dialog` / `ConfirmHost` / `ToastHost` | 弹层、二次确认、非阻断提示 |
| `Progress` / `EmptyState` | 进度与空状态 |
| `Icon` | 单线性图标（16/18px，`currentColor`） |

页面不再各自拼装按钮/卡片样式；新增界面一律复用这些原语，避免再次出现"每个页面一套按钮"。

## 7. 组件规范

| 组件 | 类 | 规则 |
| --- | --- | --- |
| 主按钮 | `fm-btn fm-btn--primary` | 实心强调色；一个视图最多一个 |
| 次按钮 | `fm-btn fm-btn--ghost` | 描边 + 二级文字色，hover 提亮 |
| 危险操作 | `fm-btn fm-btn--danger` | 低饱和红底 + 红字，不用纯红实心（避免抢主操作） |
| 标签胶囊 | `fm-chip--study / --music / --ent` | 半透明语义底 + 同色文字，禁止实心亮色块配白字 |
| 卡片 | `fm-card` | 一像素边框 + 轻阴影；不堆叠多层卡片 |
| 分段标签页 | `fm-tabs / fm-tab` | 胶囊分段控件，激活项实心强调；计数用小号等宽字体 |
| 空状态 | `fm-empty` | 虚线边框 + 13px 三级文字，给"下一步做什么"的提示 |
| 数字 | `fm-stat__value` | 等宽 + tabular-nums + 负字距 |
| 输入 | 语义背景 + `border-secondary` | focus 时边框转强调色 |

**图标策略（待执行）**：当前大量使用 emoji（📚🎮🎵🔒🕵️），跨平台字形不一致、颜色不可控。计划引入 16/18px 单线性图标（lucide 或自绘 SVG，`currentColor` 描边 1.5px），保留 emoji 仅用于用户内容（如视频标题）之外的情感点缀；状态类图标全部替换。

## 8. B 站页面内（Content Script）样式规则

1. **命名空间**：`bfm-` / `.bilibili-focus-mode-*`，禁止再新增全局裸类名。
2. **禁止宽泛选择器**：`[class*="ad-"]`、`[class*="hot"]`、`[id*="ad"]`、`[class*="comment"]` 会误伤（例如 `photo` 含 `hot`）。改成明确的站点类名清单，并提供"失效即忽略"的降级。
3. **禁止无条件覆盖**：评论/推荐/头部导航的隐藏必须由配置开关驱动（`purify.css` 曾无条件隐藏评论，已修复）。
4. **可逆性**：任何隐藏播放器、暂停、全屏退出都必须记录原值并在解除拦截时恢复（`BlockOverlayHost` 已实现）。
5. **z-index 阶梯**：搜索框 999998 < 拦截层 2147483646 < 分类弹窗 2147483647；不要使用 999999 这种"看起来很大"的值。
6. **样式注入去重**：`StyleInjector` 已按 `textContent` 差异更新，避免每次 SPA 导航重建 `<style>` 造成重排。
7. **SPA 清理**：页面级规则改为"当前路由 CSS 合并为一张表"，离开路由时整体替换/移除，避免旧规则残留。

## 9. 迁移检查清单

- [x] 静态调色板 + `data-fm-*` 切换（无 FOUC、无运行时 CSS 字符串）
- [x] Tailwind `@theme` 桥接，补齐 `bg-accent` / `bg-accent/90` / `ring-accent` / `text-on-accent`
- [x] 清除 `bg-gray-* / text-gray-* / bg-blue-600 ...` 原始色阶
- [x] 管理页外壳 / 标签页 / 弹窗 / 主题页改用 `fm-*` 原语
- [x] 拦截层视觉重做（墨色玻璃卡片 + 单一决策色）
- [x] 封面图加载修复（去掉 `crossOrigin`，改 `referrerPolicy=no-referrer`）
- [x] 专注首页封面占位改为本地 SVG，移除 `picsum.photos`
- [x] 管理页/统计/首页核心图标替换为 `Icon` 单线性图标（配置子面板少量 emoji 待清理）
- [x] 配置分区统一卡片/表单控件样式（`fm-config` + 全局输入/开关样式）
- [x] 弹窗状态摘要（待审/即时/债务/审批窗口）
- [ ] 配置子面板折叠 + 行式开关（P2）
- [ ] 列表虚拟化（P2，见 OPTIMIZATION-REVIEW）
