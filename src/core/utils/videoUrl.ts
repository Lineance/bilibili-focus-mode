/**
 * Generate Bilibili video/live URL from bvid
 */
export function getVideoUrl(bvid: string): string {
  if (bvid.startsWith('LIVE_')) {
    return `https://live.bilibili.com/${bvid.replace('LIVE_', '')}`;
  }
  return `https://www.bilibili.com/video/${bvid}`;
}

/**
 * Extract BV ID from a Bilibili URL or raw BV ID string
 * Supports:
 *   - https://www.bilibili.com/video/BV1xpjB6fEoF
 *   - https://www.bilibili.com/video/BV1xpjB6fEoF?spm_id_from=...
 *   - BV1xpjB6fEoF
 *   - BV1xpjB6fEoF/
 */
export function extractBvid(input: string): string | null {
  const trimmed = input.trim();

  const bvMatch = trimmed.match(/(BV[a-zA-Z0-9]+)/);
  if (bvMatch) {
    return bvMatch[1];
  }

  return null;
}

/**
 * Clean Bilibili URL by removing tracking parameters
 * Keeps only the base video URL with the BV ID
 */
export function cleanBilibiliUrl(url: string): string {
  const bvid = extractBvid(url);
  if (!bvid) return url.trim();
  return getVideoUrl(bvid);
}
