import type { DebtAccount, VideoTag } from '@core/types';

export interface WatchSession {
  bvid: string;
  tag: VideoTag;
  startTime: number;
  lastUpdateTime: number;
  totalWatchedMinutes: number;
}

export class DebtTracker {
  private currentSession: WatchSession | null = null;
  private checkInterval: number | null = null;
  private readonly onDebtUpdate: (account: DebtAccount) => void;
  private readonly onBankruptcy: () => void;
  private readonly entertainmentRatio: number;
  private readonly learningRepayRatio: number;
  private readonly maxDebtMinutes: number;

  constructor(
    entertainmentRatio: number,
    learningRepayRatio: number,
    maxDebtMinutes: number,
    onDebtUpdate: (account: DebtAccount) => void,
    onBankruptcy: () => void
  ) {
    this.entertainmentRatio = entertainmentRatio;
    this.learningRepayRatio = learningRepayRatio;
    this.maxDebtMinutes = maxDebtMinutes;
    this.onDebtUpdate = onDebtUpdate;
    this.onBankruptcy = onBankruptcy;
  }

  startWatching(bvid: string, tag: VideoTag, currentDebt: number): void {
    if (this.currentSession) {
      this.stopWatching();
    }

    this.currentSession = {
      bvid,
      tag,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      totalWatchedMinutes: 0,
    };

    // Check every minute
    this.checkInterval = window.setInterval(() => {
      this.updateDebt(currentDebt);
    }, 60000);

    console.log('[DebtTracker] Started watching:', bvid, 'Tag:', tag);
  }

  stopWatching(): WatchSession | null {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    const session = this.currentSession;
    this.currentSession = null;

    if (session) {
      // Update one final time
      this.calculateDebt(session);
      console.log('[DebtTracker] Stopped watching. Total minutes:', session.totalWatchedMinutes);
    }

    return session;
  }

  private updateDebt(currentDebt: number): void {
    if (!this.currentSession) return;

    const minutes = this.calculateDebt(this.currentSession);
    const debtChange = this.calculateDebtChange(minutes, this.currentSession.tag);
    const newDebt = Math.max(0, currentDebt + debtChange);

    const account: DebtAccount = {
      currentDebt: newDebt,
      totalAccrued: this.currentSession.tag === 'ENTERTAINMENT' ? debtChange : 0,
      totalRepaid: this.currentSession.tag === 'LEARNING' ? Math.abs(Math.min(0, debtChange)) : 0,
      bankruptcyCount: 0,
      bankruptcyEndTime: null,
    };

    this.onDebtUpdate(account);

    // Check bankruptcy
    if (newDebt >= this.maxDebtMinutes) {
      this.onBankruptcy();
    }
  }

  private calculateDebt(session: WatchSession): number {
    const now = Date.now();
    const elapsedMs = now - session.lastUpdateTime;
    const elapsedMinutes = elapsedMs / 60000;

    session.totalWatchedMinutes += elapsedMinutes;
    session.lastUpdateTime = now;

    return elapsedMinutes;
  }

  private calculateDebtChange(minutes: number, tag: VideoTag): number {
    if (tag === 'ENTERTAINMENT') {
      return minutes * this.entertainmentRatio;
    } else {
      return minutes * this.learningRepayRatio;
    }
  }

  isWatching(): boolean {
    return this.currentSession !== null;
  }

  getCurrentSession(): WatchSession | null {
    return this.currentSession;
  }

  destroy(): void {
    this.stopWatching();
  }
}

// Hook for React components
export function useDebtTracker(
  entertainmentRatio: number,
  learningRepayRatio: number,
  maxDebtMinutes: number,
  onDebtUpdate: (account: DebtAccount) => void,
  onBankruptcy: () => void
) {
  return new DebtTracker(
    entertainmentRatio,
    learningRepayRatio,
    maxDebtMinutes,
    onDebtUpdate,
    onBankruptcy
  );
}
