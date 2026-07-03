import { MS_PER_HOUR } from '@core/constants';
import type { InstantItem, VideoTag } from '@core/types';

export class ExpirationService {
  constructor(
    private readonly instantDurationHours: number
  ) {}

  createInstantItem<T extends { bvid: string; title: string; uploader: string; coverUrl: string; tag: VideoTag; addedAt: number }>(
    metadata: T,
    fuseCode: string
  ): InstantItem {
    const now = Date.now();
    const durationMs = this.instantDurationHours * MS_PER_HOUR;

    return {
      ...metadata,
      expiresAt: now + durationMs,
      fuseCode,
      usedFuse: false,
    };
  }
}
