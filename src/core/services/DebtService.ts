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
    
    // Calculate actual repayment (can't repay more than existing debt)
    const actualRepaid = tag === 'LEARNING' 
      ? Math.min(account.currentDebt, Math.abs(change))
      : 0;
    
    return {
      ...account,
      currentDebt: newDebt,
      totalAccrued: tag === 'ENTERTAINMENT' 
        ? account.totalAccrued + change 
        : account.totalAccrued,
      totalRepaid: tag === 'LEARNING' 
        ? account.totalRepaid + actualRepaid
        : account.totalRepaid,
    };
  }

  isBankrupt(account: DebtAccount): boolean {
    return account.currentDebt >= this.maxDebtMinutes;
  }

  calculateBankruptcyEndTime(lockHours: number): number {
    return Date.now() + lockHours * 60 * 60 * 1000;
  }
}
