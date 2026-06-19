import type { FieldDescription } from '@core/types';

export const CONFIG_DESCRIPTIONS: Record<string, FieldDescription> = {
  timeWindowEnabled: {
    label: '启用时间窗口',
    description: '限制只能在特定时间段观看视频',
    type: 'boolean',
  },
  windowStart: {
    label: '窗口开始时间',
    description: '允许观看的开始时间（如 20:00）',
    type: 'time',
  },
  windowEnd: {
    label: '窗口结束时间',
    description: '允许观看的结束时间（如 21:00）',
    type: 'time',
  },
  limboCapacity: {
    label: '待审池容量',
    description: '待审池最多可容纳的视频数量',
    type: 'number',
  },
  limboReviewTime: {
    label: '待审提醒时间',
    description: '每日提醒审查待审池的时间',
    type: 'time',
  },
  limboAutoPurgeHours: {
    label: '待审自动清理时间',
    description: '待审池视频自动清理的时间（小时）',
    type: 'number',
  },
  coolingCooldownHours: {
    label: '冷静期时长',
    description: '冷却期的等待时长（小时）',
    type: 'number',
  },
  coolingAvailableHours: {
    label: '可用期时长',
    description: '冷却期后可供观看的时长（小时）',
    type: 'number',
  },
  instantDurationHours: {
    label: '即时许可有效期',
    description: '即时许可的有效时长（小时）',
    type: 'number',
  },
  instantBreakFuse: {
    label: '允许熔断码打破时段',
    description: '是否允许使用熔断码在非窗口时段观看',
    type: 'boolean',
  },
  baseFuseLength: {
    label: '基础熔断码长度',
    description: '熔断码的基础字符长度',
    type: 'number',
  },
  maxFuseLength: {
    label: '最大熔断码长度',
    description: '熔断码的最大字符长度',
    type: 'number',
  },
  maxGroups: {
    label: '最大分组数',
    description: '永久分组的最大数量',
    type: 'number',
  },
  maxItemsPerGroup: {
    label: '每组最大项目数',
    description: '每个永久分组最多可容纳的视频数',
    type: 'number',
  },
  totalPermanentLimit: {
    label: '永久分组总限制',
    description: '所有永久分组的视频总数限制',
    type: 'number',
  },
  ghostLifespanDays: {
    label: '幽灵寿命',
    description: '幽灵档案可招魂的天数',
    type: 'number',
  },
  ghostResurrectFuseLength: {
    label: '招魂熔断码长度',
    description: '招魂所需的熔断码长度',
    type: 'number',
  },
  ghostDoublePenalty: {
    label: '招魂双倍惩罚',
    description: '招魂后是否应用双倍冷静期',
    type: 'boolean',
  },
  debtEnabled: {
    label: '启用债务系统',
    description: '是否启用债务追踪功能',
    type: 'boolean',
  },
  entertainmentRatio: {
    label: '娱乐债务倍率',
    description: '观看娱乐视频产生的债务倍率',
    type: 'number',
  },
  learningRepayRatio: {
    label: '学习偿还倍率',
    description: '观看学习视频偿还债务的倍率（负数）',
    type: 'number',
  },
  maxDebtMinutes: {
    label: '破产阈值',
    description: '触发破产的债务阈值（分钟）',
    type: 'number',
  },
  bankruptcyLockHours: {
    label: '破产锁定时长',
    description: '破产后锁定的时长（小时）',
    type: 'number',
  },
  bankruptcyOverrideMaxFuse: {
    label: '破产熔断码最大长度',
    description: '破产时熔断码的最大长度',
    type: 'number',
  },
  dynamicFuseEnabled: {
    label: '启用动态熔断码',
    description: '根据申请频率动态调整熔断码长度',
    type: 'boolean',
  },
  postWatchCooldownMinutes: {
    label: '观看后冷静期',
    description: '观看后的冷静期时长（分钟）',
    type: 'number',
  },
  dailyCoolingQuota: {
    label: '每日冷却配额',
    description: '每日可申请冷却的最大次数（0=无限制）',
    type: 'number',
  },
  dailyInstantQuota: {
    label: '每日即时配额',
    description: '每日可申请即时许可的最大次数（0=无限制）',
    type: 'number',
  },
  collectionDetectionEnabled: {
    label: '启用合集检测',
    description: '自动检测并处理合集视频',
    type: 'boolean',
  },
  videoPlayerSimplification: {
    label: '视频播放页样式简化',
    description: '简化视频播放页布局，减少干扰元素',
    type: 'boolean',
  },
  homepageSimplification: {
    label: '首页样式简化',
    description: '简化首页布局，减少干扰元素',
    type: 'boolean',
  },
  dynamicSimplification: {
    label: '动态页样式简化',
    description: '简化动态页布局，仅显示关注内容',
    type: 'boolean',
  },
  liveSimplification: {
    label: '直播页样式简化',
    description: '简化直播页面布局，减少干扰元素',
    type: 'boolean',
  },
  searchSimplification: {
    label: '搜索结果简化',
    description: '简化搜索结果页面，隐藏广告和推荐内容',
    type: 'boolean',
  },
  keywordRules: {
    label: '关键词自动放行',
    description: '根据视频标题关键词自动放行',
    type: 'boolean',
  },
  dailyBypassEnabled: {
    label: '每日放行',
    description: '开启后，每天可使用N次放行功能，暂时跳过视频拦截',
    type: 'toggle',
  },
  dailyBypassQuota: {
    label: '每日放行次数',
    description: '每天可使用放行功能的次数（1-10）',
    type: 'number',
    min: 1,
    max: 10,
    step: 1,
  },
  dailyBypassDurationMinutes: {
    label: '放行时长（分钟）',
    description: '每次放行的有效时长（5-120分钟）',
    type: 'number',
    min: 5,
    max: 120,
    step: 5,
  },
  nativeMessagingEnabled: {
    label: '启用外部监控连接',
    description: '允许外部监控程序通过 Native Messaging 检测扩展状态',
    type: 'boolean',
  },
};
