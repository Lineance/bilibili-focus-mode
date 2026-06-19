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
  _config: { entertainmentRatio: number; learningRepayRatio: number }
): { account: DebtAccount; changed: boolean } {
  if (!isFinite(debtAccount.currentDebt)) {
    logger.debug('DebtMigrationService', 'Resetting corrupted currentDebt:', debtAccount.currentDebt, '-> 0');
    return {
      account: { ...debtAccount, currentDebt: 0 },
      changed: true,
    };
  }

  return { account: debtAccount, changed: false };
}
