import type { DebtAccount } from '@core/types';
import { logger } from '@core/utils/logger';

interface LegacyDebtAccount {
  totalAccrued?: number;
  totalRepaid?: number;
  totalMusicMinutes?: number;
}

export function migrateDebtAccount(debtAccount: DebtAccount): DebtAccount {
  let migrated = { ...debtAccount };

  if ('totalAccrued' in migrated || 'totalRepaid' in migrated) {
    const legacy = migrated as LegacyDebtAccount & DebtAccount;
    migrated = {
      ...migrated,
      totalEntertainmentMinutes: legacy.totalAccrued || 0,
      totalLearningMinutes: legacy.totalRepaid || 0,
      totalMusicMinutes: legacy.totalMusicMinutes || 0,
    };
    migrated = Object.fromEntries(
      Object.entries(migrated).filter(([k]) => k !== 'totalAccrued' && k !== 'totalRepaid')
    ) as unknown as DebtAccount;
  }

  if (migrated.totalMusicMinutes === undefined) {
    migrated.totalMusicMinutes = 0;
  }

  return migrated;
}

export function syncCurrentDebt(
  debtAccount: DebtAccount,
  config: { entertainmentRatio: number; learningRepayRatio: number }
): { account: DebtAccount; changed: boolean } {
  const entertainmentDebt = (debtAccount.totalEntertainmentMinutes || 0) * config.entertainmentRatio;
  const learningRepaid = (debtAccount.totalLearningMinutes || 0) * config.learningRepayRatio;
  const recalculatedDebt = entertainmentDebt + learningRepaid;

  if (Math.abs(debtAccount.currentDebt - recalculatedDebt) > 0.1) {
    logger.debug('DebtMigrationService', 'Syncing currentDebt with totals:', debtAccount.currentDebt, '->', recalculatedDebt);
    return { account: { ...debtAccount, currentDebt: recalculatedDebt }, changed: true };
  }

  return { account: debtAccount, changed: false };
}
