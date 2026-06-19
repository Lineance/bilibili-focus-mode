import { MS_PER_DAY, MS_PER_HOUR } from '@core/constants';
import type { CoolingItem, InstantItem, GhostItem, VideoTag } from '@core/types';

export class ExpirationService {
  constructor(
    private readonly coolingCooldownHours: number,
    private readonly coolingAvailableHours: number,
    private readonly instantDurationHours: number,
    private readonly ghostLifespanDays: number
  ) {}

  createCoolingItem<T extends { bvid: string; title: string; uploader: string; coverUrl: string; tag: VideoTag; addedAt: number }>(
    metadata: T
  ): CoolingItem {
    const now = Date.now();
    const cooldownMs = this.coolingCooldownHours * MS_PER_HOUR;
    const availableMs = this.coolingAvailableHours * MS_PER_HOUR;

    return {
      ...metadata,
      availableAt: now + cooldownMs,
      expiresAt: now + cooldownMs + availableMs,
    };
  }

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

  createGhostItem<T extends { bvid: string; title: string; uploader: string; coverUrl: string; tag: VideoTag; addedAt: number }>(
    metadata: T
  ): GhostItem {
    const now = Date.now();
    const lifespanMs = this.ghostLifespanDays * MS_PER_DAY;

    return {
      ...metadata,
      diedAt: now,
      canResurrectUntil: now + lifespanMs,
    };
  }
}
