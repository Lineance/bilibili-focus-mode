import type { CoolingItem, InstantItem, GhostItem } from '@core/types';

export class ExpirationService {
  constructor(
    private readonly coolingCooldownHours: number,
    private readonly coolingAvailableHours: number,
    private readonly instantDurationHours: number,
    private readonly ghostLifespanDays: number
  ) {}

  createCoolingItem<T extends { bvid: string; title: string; uploader: string; coverUrl: string; tag: 'LEARNING' | 'ENTERTAINMENT'; addedAt: number }>(
    metadata: T
  ): CoolingItem {
    const now = Date.now();
    const cooldownMs = this.coolingCooldownHours * 60 * 60 * 1000;
    const availableMs = this.coolingAvailableHours * 60 * 60 * 1000;

    return {
      ...metadata,
      availableAt: now + cooldownMs,
      expiresAt: now + cooldownMs + availableMs,
    };
  }

  createInstantItem<T extends { bvid: string; title: string; uploader: string; coverUrl: string; tag: 'LEARNING' | 'ENTERTAINMENT'; addedAt: number }>(
    metadata: T,
    fuseCode: string
  ): InstantItem {
    const now = Date.now();
    const durationMs = this.instantDurationHours * 60 * 60 * 1000;

    return {
      ...metadata,
      expiresAt: now + durationMs,
      fuseCode,
      usedFuse: false,
    };
  }

  createGhostItem<T extends { bvid: string; title: string; uploader: string; coverUrl: string; tag: 'LEARNING' | 'ENTERTAINMENT'; addedAt: number }>(
    metadata: T
  ): GhostItem {
    const now = Date.now();
    const lifespanMs = this.ghostLifespanDays * 24 * 60 * 60 * 1000;

    return {
      ...metadata,
      diedAt: now,
      canResurrectUntil: now + lifespanMs,
    };
  }

  isCoolingAvailable(item: CoolingItem): boolean {
    const now = Date.now();
    return now >= item.availableAt && now < item.expiresAt;
  }

  isInstantValid(item: InstantItem): boolean {
    return Date.now() < item.expiresAt;
  }

  isGhostResurrectable(item: GhostItem): boolean {
    return Date.now() < item.canResurrectUntil;
  }

  getCoolingVisualState(item: CoolingItem): 'cooling' | 'early' | 'expiring' | 'expired' {
    const now = Date.now();

    if (now < item.availableAt) {
      return 'cooling';
    }

    if (now >= item.expiresAt) {
      return 'expired';
    }

    // Calculate progress through the AVAILABLE period only (not including cooling)
    const availableDuration = item.expiresAt - item.availableAt;
    const elapsedInAvailable = now - item.availableAt;
    const progressInAvailable = elapsedInAvailable / availableDuration;

    if (progressInAvailable < 0.5) {
      return 'early';
    } else {
      return 'expiring';
    }
  }
}
