/**
 * CSS constants extracted from Bilibili-Evolved migrated components.
 * Source: migrated-components/
 */

/** 隐藏搜索热搜 */
export const CSS_HIDE_TRENDING_SEARCH = `
.search-panel > .trending, .search-pannel > .trending {
  display: none !important;
}
.search-panel:not(:has(.history)), .search-pannel:not(:has(.history)) {
  padding: 0 !important;
  border: none !important;
}
`;

/** 隐藏用户信息卡片 */
export const CSS_HIDE_USER_CARD = `
.user-card, .user-card-m-exp, .bili-user-profile, bili-user-profile {
  display: none !important;
}
`;

/** 隐藏头像框 */
export const CSS_HIDE_USER_PENDENT = `
.bili-avatar .layer:not(:first-child) {
  display: none !important;
}
`;

/** 隐藏记笔记按钮 */
export const CSS_HIDE_VIDEO_NOTES = `
.video-toolbar-container .video-note .video-note-inner,
.video-toolbar .note-btn {
  display: none !important;
}
`;

/** 隐藏视频分享按钮 */
export const CSS_HIDE_VIDEO_SHARE = `
.video-toolbar-v1 .share-wrap,
.video-toolbar .share-btn {
  display: none !important;
}
`;

/** 隐藏稿件投诉按钮 */
export const CSS_HIDE_VIDEO_REPORT = `
.video-toolbar-container .video-complaint,
.video-toolbar .appeal-btn {
  display: none !important;
}
`;

/** 隐藏视频标题层（鼠标经过时右上角覆盖层） */
export const CSS_HIDE_VIDEO_TOP_MASK = `
.bpx-player-top-wrap,
.bilibili-player-top-wrap {
  display: none !important;
}
`;

/** 隐藏视频推荐列表 */
export const CSS_HIDE_RELATED_VIDEOS = `
#recom_module, #reco_list,
.video-card-container:has(.video-card-card),
.right-container .recommend-list {
  display: none !important;
}
`;

/** 隐藏直播推荐 */
export const CSS_HIDE_RECOMMENDED_LIVE = `
#live_recommand_report,
.live-list,
.video-card-container:has(.live-card) {
  display: none !important;
}
`;

/** 禁用特殊弹幕样式 */
export const CSS_DISABLE_SPECIAL_DANMAKU = `
.bili-danmaku-x-high,
.bili-danmaku-x-dm,
.danmaku-item--highlight,
.danmaku-item--special {
  color: inherit !important;
  background: none !important;
  border: none !important;
  font-weight: inherit !important;
  font-size: inherit !important;
}
`;

/** 细滚动条 */
export const CSS_ELEGANT_SCROLLBAR = `
html ::-webkit-scrollbar {
  width: 5px !important;
  height: 5px !important;
}
html ::-webkit-scrollbar-corner,
html ::-webkit-scrollbar-track {
  background: transparent !important;
}
html ::-webkit-resizer,
html ::-webkit-scrollbar-thumb {
  background: #aaa;
  border-radius: 3px;
}
html ::-webkit-scrollbar-thumb:hover {
  background: #888;
}
html,
html * {
  scrollbar-color: #aaa transparent;
  scrollbar-width: thin !important;
}
`;

/** 删除广告 */
export const CSS_REMOVE_PROMOTIONS = `
#slide_ad,
.v-wrap .vcd,
.ad-report,
.ad-floor,
.ad-banner,
.bili-video-card:has(.bili-video-card__stats--ad),
[class*="promotion"],
[id*="slide_ad"] {
  display: none !important;
}
`;

/** 隐藏直播马赛克 */
export const CSS_HIDE_PLAYER_BLUR = `
#web-player-module-area-mask-panel,
.player-mask-panel {
  display: none !important;
}
`;

/** 删除直播水印 */
export const CSS_REMOVE_WATERMARK = `
.player-ctnr .web-player-icon-roomStatus,
.live-player-multiple-toast-wrp,
.web-player-icon-roomStatus {
  display: none !important;
}
`;
