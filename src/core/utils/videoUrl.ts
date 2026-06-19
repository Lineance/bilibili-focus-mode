/**
 * Generate Bilibili video/live URL from bvid
 */
export function getVideoUrl(bvid: string): string {
  if (bvid.startsWith('LIVE_')) {
    return `https://live.bilibili.com/${bvid.replace('LIVE_', '')}`;
  }
  return `https://www.bilibili.com/video/${bvid}`;
}
