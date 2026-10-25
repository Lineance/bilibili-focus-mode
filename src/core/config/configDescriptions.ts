import type { FieldDescription } from '@core/types';

export const CONFIG_DESCRIPTIONS: Record<string, FieldDescription> = {
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
  postWatchCooldownMinutes: {
    label: '观看后冷静期',
    description: '观看后的冷静期时长（分钟）',
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
    description: '开启后，每天可使用指定次数的全量放行',
    type: 'toggle',
  },
  dailyBypassQuota: {
    label: '每日放行次数',
    description: '每天可使用全量放行的次数',
    type: 'number',
    min: 1,
    max: 10,
    step: 1,
  },
  dailyBypassDurationMinutes: {
    label: '放行时长（分钟）',
    description: '每次全量放行的有效时长',
    type: 'number',
    min: 5,
    max: 120,
    step: 5,
  },
  dailyWatchLimitMinutes: {
    label: '每日观看限额（分钟）',
    description: '每日允许观看的总时长上限',
    type: 'number',
    min: 30,
    max: 480,
    step: 10,
  },
  nativeMessagingEnabled: {
    label: '启用外部监控连接',
    description: '允许外部监控程序检测扩展状态',
    type: 'boolean',
  },
  appearanceEnhancement: {
    label: '外观增强',
    description: '自定义页面外观，隐藏不需要的元素',
    type: 'boolean',
  },
  liveEnhancement: {
    label: '直播增强',
    description: '优化直播页面体验',
    type: 'boolean',
  },
  videoPlayerEnhancement: {
    label: '播放器增强',
    description: '增强视频播放器功能',
    type: 'boolean',
  },
  themeEnhancement: {
    label: '主题增强',
    description: '主题和封面相关增强功能',
    type: 'boolean',
  },
};
