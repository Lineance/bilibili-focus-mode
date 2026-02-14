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
    } else {
      return minutes * this.learningRepayRatio;
    }
  }

  updateDebt(account: DebtAccount, minutes: number, tag: VideoTag): DebtAccount {
    const change = this.calculateDebtChange(minutes, tag);
    const rawNewDebt = account.currentDebt + change;
    const newDebt = Math.max(0, rawNewDebt);
    
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
    };
  }

  isBankrupt(account: DebtAccount): boolean {
    return account.currentDebt >= this.maxDebtMinutes;
  }

  calculateBankruptcyEndTime(lockHours: number): number {
    return Date.now() + lockHours * 60 * 60 * 1000;
  }
}
