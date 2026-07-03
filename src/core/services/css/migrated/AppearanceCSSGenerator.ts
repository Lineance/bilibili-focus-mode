import type { AppearanceEnhancementConfig } from '@core/types';
import {
  CSS_HIDE_TRENDING_SEARCH,
  CSS_HIDE_USER_CARD,
  CSS_HIDE_USER_PENDENT,
  CSS_HIDE_VIDEO_NOTES,
  CSS_HIDE_VIDEO_SHARE,
  CSS_HIDE_VIDEO_REPORT,
  CSS_HIDE_VIDEO_TOP_MASK,
  CSS_HIDE_RELATED_VIDEOS,
  CSS_HIDE_RECOMMENDED_LIVE,
  CSS_DISABLE_SPECIAL_DANMAKU,
  CSS_ELEGANT_SCROLLBAR,
  CSS_REMOVE_PROMOTIONS,
} from './css-constants';

export class AppearanceCSSGenerator {
  generate(config: AppearanceEnhancementConfig): string {
    const rules: string[] = [];

    if (config.elegantScrollbar) rules.push(CSS_ELEGANT_SCROLLBAR);
    if (config.hideTrendingSearch) rules.push(CSS_HIDE_TRENDING_SEARCH);
    if (config.hideUserCard) rules.push(CSS_HIDE_USER_CARD);
    if (config.hideUserPendent) rules.push(CSS_HIDE_USER_PENDENT);
    if (config.hideVideoNotes) rules.push(CSS_HIDE_VIDEO_NOTES);
    if (config.hideVideoShare) rules.push(CSS_HIDE_VIDEO_SHARE);
    if (config.hideVideoReport) rules.push(CSS_HIDE_VIDEO_REPORT);
    if (config.hideVideoTopMask) rules.push(CSS_HIDE_VIDEO_TOP_MASK);
    if (config.hideRelatedVideos) rules.push(CSS_HIDE_RELATED_VIDEOS);
    if (config.hideRecommendedLive) rules.push(CSS_HIDE_RECOMMENDED_LIVE);
    if (config.disableSpecialDanmaku) rules.push(CSS_DISABLE_SPECIAL_DANMAKU);
    if (config.removePromotions) rules.push(CSS_REMOVE_PROMOTIONS);

    return rules.join('\n');
  }
}
