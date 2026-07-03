# Bilibili Evolved 迁移组件列表

从 Bilibili-Evolved 项目中精选的 21 个常用组件，适用于自用项目。

---

## 直播相关 (4个)

| 组件名                | 文件路径                               | 功能说明                                                            |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `hideLivePlayerBlur`  | `components/live/hide-player-blur.js`  | 隐藏直播马赛克 - 移除直播画面中的马赛克区域                         |
| `liveChatPanelFit`    | `components/live/chat-panel-fit.js`    | 直播间网页全屏自适应 - 自动调整侧边栏宽度，使视频比例匹配源，无黑边 |
| `removeLiveMaskPanel` | `components/live/remove-mask-panel.js` | 删除直播马赛克遮罩 - 删除某些分区的马赛克遮罩                       |
| `removeLiveWatermark` | `components/live/remove-watermark.js`  | 删除直播水印 - 删除直播角落的水印                                   |

## 样式 - 夜间模式 (1个)

| 组件名                 | 文件路径                                      | 功能说明                             |
| ---------------------- | --------------------------------------------- | ------------------------------------ |
| `darkModeFollowSystem` | `components/style/dark-mode/follow-system.js` | 夜间模式跟随系统 - 同步系统亮/暗主题 |

## 样式 - 隐藏元素 (10个)

| 组件名                | 文件路径                                          | 功能说明                                          |
| --------------------- | ------------------------------------------------- | ------------------------------------------------- |
| `hideTrendingSearch`  | `components/style/hide/trending-search.js`        | 隐藏热搜 - 隐藏搜索栏和搜索页面的热搜词           |
| `hideUserCard`        | `components/style/hide/user-card.js`              | 隐藏用户信息卡片 - 隐藏鼠标指向用户名时弹出的卡片 |
| `hideUserPendent`     | `components/style/hide/user-pendent.js`           | 隐藏头像框 - 隐藏用户头像框和角标                 |
| `hideVideoNotes`      | `components/style/hide/video/notes.js`            | 隐藏记笔记 - 隐藏视频页面的"记笔记"按钮           |
| `hideRecommendedLive` | `components/style/hide/video/recommended-live.js` | 隐藏直播推荐 - 隐藏视频页面右侧的直播推荐         |
| `hideRelatedVideos`   | `components/style/hide/video/related-videos.js`   | 隐藏视频推荐 - 隐藏番剧和视频页面右侧的推荐列表   |
| `hideVideoReport`     | `components/style/hide/video/report.js`           | 隐藏稿件投诉 - 隐藏视频页面的"稿件投诉"按钮       |
| `hideVideoShare`      | `components/style/hide/video/share.js`            | 隐藏视频分享 - 隐藏播放器下方的分享按钮           |
| `hideVideoTopMask`    | `components/style/hide/video/top-mask.js`         | 隐藏视频标题层 - 隐藏鼠标经过时右上角的覆盖层     |

## 样式 - 其他 (3个)

| 组件名                  | 文件路径                              | 功能说明                                              |
| ----------------------- | ------------------------------------- | ----------------------------------------------------- |
| `replaceCover`          | `components/style/replace-cover.js`   | 替换标题党封面 - 用视频预览帧替换封面，杜绝图文不符   |
| `elegantScrollbar`      | `components/style/scrollbar.js`       | 使用细滚动条 - 使用浏览器风格的细滚动条替代系统滚动条 |
| `disableSpecialDanmaku` | `components/style/special-danmaku.js` | 禁用特殊弹幕样式 - 移除高亮/UP主弹幕的特殊样式        |

## 工具类 (1个)

| 组件名             | 文件路径                                | 功能说明                                                     |
| ------------------ | --------------------------------------- | ------------------------------------------------------------ |
| `removePromotions` | `components/utils/remove-promotions.js` | 删除广告 - 删除站内各种广告（推广模块、APP推荐、右侧广告等） |

## 视频播放器 (3个)

| 组件名                    | 文件路径                                               | 功能说明                                               |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `extendVideoSpeed`        | `components/video/player/extend-speed.js`              | 扩展倍速 - 突破原有播放倍数限制，支持0.0625x-16x       |
| `rememberVideoSpeed`      | `components/video/player/remember-speed.js`            | 记忆倍速 - 跨页共享倍速，可按视频分别记忆              |
| `rememberVideoCollection` | `components/video/player/remember-video-collection.js` | 记忆合集 - 记忆合集与多P视频的播放进度，标记已观看位置 |

---

## 目录结构

```
migrated-components/
├── INDEX.md                          # 本文件
└── components/
    ├── live/
    │   ├── hide-player-blur.js
    │   ├── chat-panel-fit.js
    │   ├── remove-mask-panel.js
    │   └── remove-watermark.js
    ├── style/
    │   ├── dark-mode/
    │   │   └── follow-system.js
    │   ├── hide/
    │   │   ├── trending-search.js
    │   │   ├── user-card.js
    │   │   ├── user-pendent.js
    │   │   └── video/
    │   │       ├── notes.js
    │   │       ├── recommended-live.js
    │   │       ├── related-videos.js
    │   │       ├── report.js
    │   │       ├── share.js
    │   │       └── top-mask.js
    │   ├── replace-cover.js
    │   ├── scrollbar.js
    │   └── special-danmaku.js
    ├── utils/
    │   └── remove-promotions.js
    └── video/
        └── player/
            ├── extend-speed.js
            ├── remember-speed.js
            └── remember-video-collection.js
```

---

## 使用说明

这些组件从 [Bilibili-Evolved](https://github.com/the1812/Bilibili-Evolved) 项目提取，需要配合脚本管理器（Tampermonkey/Violentmonkey）使用。
