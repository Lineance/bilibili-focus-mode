import { MS_PER_HOUR } from '@core/constants';
import type { DebtAccount, VideoTag } from '@core/types';

export class DebtService {
  constructor(
    private readonly entertainmentRatio: number,
    private readonly learningRepayRatio: number,
    private readonly maxDebtMinutes: number
  ) {}

  calculateDebtChange(minutes: number, tag: VideoTag): number {
    if (tag === 'ENTERTAINMENT') {
      return minutes * this.entertainmentRatio;
    } else if (tag === 'LEARNING') {
      return minutes * this.learningRepayRatio;
    }
    // MUSIC tag doesn't change debt
    return 0;
  }

  updateDebt(account: DebtAccount, minutes: number, tag: VideoTag): DebtAccount {
    const change = this.calculateDebtChange(minutes, tag);
    const newDebt = account.currentDebt + change;
    
    return {
      ...account,
      currentDebt: newDebt,
      // Accumulate watch time based on tag
      totalEntertainmentMinutes: tag === 'ENTERTAINMENT'
        ? account.totalEntertainmentMinutes + minutes
        : account.totalEntertainmentMinutes,
      totalLearningMinutes: tag === 'LEARNING'
        ? account.totalLearningMinutes + minutes
        : account.totalLearningMinutes,
      totalMusicMinutes: tag === 'MUSIC'
        ? account.totalMusicMinutes + minutes
        : account.totalMusicMinutes,
    };
  }

  isBankrupt(account: DebtAccount): boolean {
    return account.currentDebt >= this.maxDebtMinutes;
  }

  calculateBankruptcyEndTime(lockHours: number): number {
    return Date.now() + lockHours * MS_PER_HOUR;
  }
}
