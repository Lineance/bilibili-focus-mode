Bilibili Focus Mode - 完整技术开发报告 v1.0
1. 项目概述与架构哲学
1.1 产品定位
基于白名单（Block-All-Except）的深度时间管理工具，采用播放页集中拦截架构。通过四态许可系统（Limbo → Cooling → Instant → Permanent）结合债务机制（Watch Debt），实现"意图性娱乐"（Intentioned Entertainment）。
1.2 核心设计原则
延迟满足：Limbo 强制审查 + Cooling 24h 冷静期
成本梯度：免费等待 < 熔断代价 < 破产惩罚 < 幽灵招魂
债务平衡：娱乐产生债务，学习偿还债务，强制行为矫正
软锁设计：技术层面可绕过，依赖心理学机制（损失厌恶、沉没成本）实现自律
1.3 架构概览
plain
复制
用户点击视频（首页/动态页无拦截）
    ↓
播放页加载 → 立即净化（移除评论/推荐）
    ↓
权限检查流程：
    ├─ Permanent Group → 随时观看（偿还债务）
    ├─ Instant → 6h有效（可打破时段，产生债务）
    ├─ Cooling → 24h冷静+48h可用（遵守时段）
    ├─ Ghost → 7天招魂期（64位熔断码复活）
    └─ 无许可 → Block Overlay（提供添加入口）
2. 数据模型与存储结构
2.1 核心存储 Schema（Storage v3）
TypeScript
复制
interface ExtensionStorage {
  version: 3;
  
  // 四态列表
  limboList: LimboItem[];
  coolingList: CoolingItem[];
  instantList: InstantItem[];
  permanentGroups: PermanentGroup[];  // 分组存储，最多4组，每组≤10项
  
  // 幽灵档案
  ghostList: GhostItem[];
  
  // 行为与统计
  behaviorLog: BehaviorLog;
  globalStats: GlobalStats;
  debtAccount: DebtAccount;
  
  // 配置中心
  config: ExtensionConfig;
}

// 元数据结构（所有列表共享）
interface VideoMetadata {
  bvid: string;
  title: string;        // 前50字符
  uploader: string;
  coverUrl: string;     // 封面CDN链接
  tag: 'LEARNING' | 'ENTERTAINMENT';  // 强制用户选择，无默认
  addedAt: number;
}

// 四态Item定义
interface LimboItem extends VideoMetadata {
  sourceUrl: string;    // 添加来源页面
}

interface CoolingItem extends VideoMetadata {
  availableAt: number;  // T+24h（可配置）
  expiresAt: number;    // T+72h（可配置）
}

interface InstantItem extends VideoMetadata {
  expiresAt: number;    // T+6h（可配置）
  fuseCode: string;     // 申请时生成的熔断码
  usedFuse: boolean;    // 是否已使用熔断码打破时段
}

interface PermanentGroup {
  id: string;
  name: string;
  items: VideoMetadata[];
  debtPriority: number; // 债务偿还优先级（越小越优先）
}

interface GhostItem extends VideoMetadata {
  diedAt: number;           // 进入幽灵态时间
  canResurrectUntil: number; // 7天后彻底删除
}
2.2 债务与统计
TypeScript
复制
interface DebtAccount {
  currentDebt: number;      // 当前债务（分钟）
  totalAccrued: number;     // 累计产生
  totalRepaid: number;      // 累计偿还
  bankruptcyCount: number;  // 破产次数
  bankruptcyEndTime: number | null; // 破产锁定结束时间
}

interface BehaviorLog {
  lastInstantApplication: number;
  instantApplicationsToday: number;
  lastWatchEnd: number;
  currentCooldownUntil: number | null; // 观看后冷静期
}

interface GlobalStats {
  fuseApplicationsTotal: number;
  fuseOverridesTotal: number;
  ghostResurrectionsTotal: number;
  bankruptcyHistory: BankruptcyRecord[];
  lifecycleTransitions: Record<string, number>; // 状态流转计数
}
3. 核心功能模块详设
3.1 播放页拦截与净化（Content Script）
净化策略：
CSS 隐藏（document_start）：立即生效，防闪烁
JS 移除（document_idle）：彻底移除 DOM，节省内存
目标元素：
css
复制
/* 完全移除 */
#comment, .comment-area, .reply-wrapper,  /* 评论区 */
.recommend-list, .next-play, .related-video, /* 推荐区 */
#danmakuBox, .danmaku-box                  /* 弹幕列表 */
Block Overlay（拦截层）：
实现：固定定位 Div（z-index: 999999）
背景：半透明黑色（rgba(0,0,0,0.95)）
内容：
视频标题（从 DOM 提取）
当前状态（未许可/Cooling中/可观看等）
操作按钮：[加入 Limbo] [立即申请（熔断码）] [加入 Permanent]
3.2 熔断码系统（Anti-Fatigue）
动态长度算法：
TypeScript
复制
function calculateFuseLength(): number {
  const recentApps = countRecentInstantApps(1 hour);
  let length = config.baseFuseLength; // 默认8
  
  if (recentApps >= 3) length = 64;
  else if (recentApps === 2) length = 32;
  else if (recentApps === 1 && within(10 minutes)) length = 16;
  
  return Math.min(length, config.maxFuseLength);
}

// 破产绕过特殊处理
function calculateBankruptcyFuse(remainingMinutes: number): number {
  // 基础64 + 剩余小时×2，上限128
  return Math.min(64 + (remainingMinutes / 60) * 2, 128);
}
生成与验证：
生成：crypto.getRandomValues(new Uint8Array(length/2)) → Hex → 分段显示（XXXX-XXXX-...）
验证：前端字符串比对（软锁）
3.3 债务系统（Watch Debt）
计算规则：
Learning：-1 分钟/分钟（偿还债务）
Entertainment：+2 分钟/分钟（产生债务）
破产阈值：currentDebt >= 60 分钟
破产惩罚：24小时禁止新申请（可128位熔断码绕过）
实时追踪：
TypeScript
复制
// 每分钟检查播放器状态
setInterval(() => {
  const video = document.querySelector('video');
  const playedMinutes = (video.currentTime - lastCheckTime) / 60;
  
  if (currentListType === 'Instant') {
    addDebt(playedMinutes * config.entertainmentRatio);
  } else if (currentListType === 'Permanent') {
    repayDebt(playedMinutes * config.learningRepayRatio);
  }
  
  if (currentDebt >= config.maxDebtMinutes) {
    video.pause();
    showBankruptcyOverlay();
  }
}, 60000);
3.4 保质期可视化（Visual Decay）
CSS Filter 方案（无需图片处理）：
css
复制
/* Cooling 阶段 */
[data-hours="0-24"] { filter: none; border: 2px solid #4ade80; }           /* 绿色：冷静期 */
[data-hours="24-36"] { filter: grayscale(50%); border: 2px solid #facc15; } /* 黄色：可用早期 */
[data-hours="36-48"] { filter: grayscale(80%) contrast(120%); border: 2px solid #fb923c; animation: shake 2s infinite; } /* 橙色：即将过期 */
[data-hours="48+"] { filter: grayscale(100%) blur(2px); border: 2px dashed #ef4444; opacity: 0.6; } /* 红色：已过期，进入 Ghost */
3.5 幽灵招魂仪式（Ghost Resurrection）
流程：
管理页 Ghost 区域选择视频
输入 128位熔断码（破产绕过长度）
输入 20字以上忏悔理由（存储并标记）
复活为 双倍 Cooling：48h 冷静期 + 48h 可用期（非标准 24+48）
标记 resurrected: true（视觉特殊边框）
4. 用户操作流程
4.1 标准路径
发现视频：首页/动态页自由浏览（无拦截）
点击播放：进入播放页 → 自动净化（无评论/推荐）
权限判定：
无许可 → Block Overlay → 选择 [加入 Limbo]
标签选择：强制选择 Learning/Entertainment（影响债务）
进入 Limbo：容量 5，24h 内必须审查
4.2 Limbo 审查（每晚 19:30 强制）
plain
复制
待审视频列表（必须全部处理）：
┌─────────────────────────────────────┐
│ [封面] 视频标题              [选择] │
│ 当前：未分类                         │
│ [📚 学习] [🎮 娱乐] [🗑️ 删除]      │
└─────────────────────────────────────┘
处理选项：
- 🧊 Cooling：24h后可用（遵守时段）
- ⚡ Instant：6h有效，需熔断码（可打破时段，产生债务）
- ⭐ Permanent：加入指定 Group（随时看，偿还债务）
- 🗑️ Delete：彻底删除
4.3 破产与绕过
触发：债务 ≥ 60分钟
状态：24h 内禁止任何新申请，播放器暂停
绕过：输入 128位熔断码（长度随剩余锁定时间动态增加）
后果：bankruptcyCount++，累计 3 次触发永久惩罚（未来所有 Instant 基础熔断码 16 位起）
5. 配置系统（全量可配置）
TypeScript
复制
interface ExtensionConfig {
  // 时间窗口
  timeWindowEnabled: boolean;
  windowStart: string;           // "20:00"
  windowEnd: string;             // "21:00"
  
  // Limbo
  limboCapacity: number;         // 5（范围 1-10）
  limboReviewTime: string;       // "19:30"
  limboAutoPurgeHours: number;   // 24
  
  // Cooling
  coolingCooldownHours: number;  // 24（可配置 1-168）
  coolingAvailableHours: number; // 48
  
  // Instant
  instantDurationHours: number;  // 6
  instantBreakFuse: boolean;     // true（允许熔断码打破时段）
  baseFuseLength: number;        // 8
  maxFuseLength: number;         // 64（正常状态）
  
  // Permanent Groups
  maxGroups: number;             // 4
  maxItemsPerGroup: number;      // 10
  totalPermanentLimit: number;   // 20
  
  // Ghost
  ghostLifespanDays: number;     // 7
  ghostResurrectFuseLength: number; // 64（基础，实际动态计算）
  ghostDoublePenalty: boolean;   // true（双倍冷静期）
  
  // Debt
  debtEnabled: boolean;
  entertainmentRatio: number;    // 2.0（产生债务倍率）
  learningRepayRatio: number;    // -1.0（偿还倍率，负数）
  maxDebtMinutes: number;        // 60（破产阈值）
  bankruptcyLockHours: number;   // 24
  bankruptcyOverrideMaxFuse: number; // 128
  
  // Anti-Fatigue
  dynamicFuseEnabled: boolean;   // true
  postWatchCooldownMinutes: number; // 5（观看后冷静期）
  dailyCoolingQuota: number;     // 0（0=无限制）
  dailyInstantQuota: number;     // 0
  
  // Collection
  collectionDetectionEnabled: boolean; // UGC Season 自动检测
}
6. 已知问题与限制（Known Issues）
表格
复制
问题	严重程度	说明	缓解方案
状态不同步	中	Content Script 内存缓存与 Storage 修改不同步	接受为 Known Issue，页面生命周期内状态固定，刷新后同步
软锁绕过	低	技术用户可通过禁用扩展/DevTools 绕过	依赖自律，不追求硬防御（个人使用场景）
封面 URL 失效	低	B站 CDN 链接可能 404	显示占位符色块，不影响核心功能
播放器监听精度	低	后台播放/倍速影响债务计算	采用 currentTime 差值，接受近似值
跨天计算复杂度	中	23:00 申请需等待至第三日 20:00（45小时）	可配置缩短 coolingCooldownHours
7. 未来开发路线图（Roadmap）
Phase 2（功能增强）
[ ] 合集批量添加：UGC Season 自动检测，一键添加全部分 P
[ ] 导出 CSV 增强：包含全局统计（熔断次数、破产次数、净债务、生命周期转换）
[ ] 保质期可视化：CSS Filter 腐化效果（灰度、抖动、模糊）
Phase 3（交互优化）
[ ] 全局快捷键：
Ctrl+Shift+A：快速添加至 Limbo
Ctrl+Shift+L：标记 Learning 并加入 Permanent
Ctrl+Shift+E：标记 Entertainment 并加入 Cooling
[ ] New Tab 看板：替换新标签页，显示今日债务、Streak、待审池状态
[ ] Streak 系统：
连续达标奖励（限额+1、熔断码长度-2）
季节性事件（期末模式：冷静期延长 50%，破产惩罚减半）