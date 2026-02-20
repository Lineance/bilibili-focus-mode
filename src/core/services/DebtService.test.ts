import { describe, it, expect, beforeEach } from 'vitest';
import { DebtService } from './DebtService';
import type { DebtAccount } from '@core/types';

describe('DebtService', () => {
  let service: DebtService;
  let account: DebtAccount;

  beforeEach(() => {
    service = new DebtService(2.0, -1.0, 60);
    account = {
      currentDebt: 0,
      bankruptcyCount: 0,
      bankruptcyEndTime: null,
      totalEntertainmentMinutes: 0,
      totalLearningMinutes: 0,
    };
  });

  describe('calculateDebtChange', () => {
    it('should calculate entertainment debt correctly', () => {
      const change = service.calculateDebtChange(10, 'ENTERTAINMENT');
      expect(change).toBe(20); // 10 * 2.0
    });

    it('should calculate learning repayment correctly', () => {
      const change = service.calculateDebtChange(10, 'LEARNING');
      expect(change).toBe(-10); // 10 * -1.0
    });
  });

  describe('updateDebt', () => {
    it('should accrue debt for entertainment', () => {
      const result = service.updateDebt(account, 10, 'ENTERTAINMENT');

      expect(result.currentDebt).toBe(20);
      expect(result.totalEntertainmentMinutes).toBe(10);
      expect(result.totalLearningMinutes).toBe(0);
    });

    it('should repay debt for learning', () => {
      account = { ...account, currentDebt: 30 };
      const result = service.updateDebt(account, 10, 'LEARNING');

      expect(result.currentDebt).toBe(20);
      expect(result.totalEntertainmentMinutes).toBe(0);
      expect(result.totalLearningMinutes).toBe(10);
    });

    it('should not allow negative debt', () => {
      const result = service.updateDebt(account, 10, 'LEARNING');

      expect(result.currentDebt).toBe(0);
      expect(result.totalLearningMinutes).toBe(10);
    });

    it('should handle partial repayment', () => {
      account = { ...account, currentDebt: 5 };
      const result = service.updateDebt(account, 10, 'LEARNING');

      expect(result.currentDebt).toBe(0);
      expect(result.totalLearningMinutes).toBe(10);
    });

    it('should accumulate watch time correctly', () => {
      // First watch entertainment
      let result = service.updateDebt(account, 10, 'ENTERTAINMENT');
      expect(result.totalEntertainmentMinutes).toBe(10);
      expect(result.totalLearningMinutes).toBe(0);

      // Then watch learning
      result = service.updateDebt(result, 5, 'LEARNING');
      expect(result.totalEntertainmentMinutes).toBe(10);
      expect(result.totalLearningMinutes).toBe(5);

      // Watch more entertainment
      result = service.updateDebt(result, 15, 'ENTERTAINMENT');
      expect(result.totalEntertainmentMinutes).toBe(25);
      expect(result.totalLearningMinutes).toBe(5);
    });
  });

  describe('isBankrupt', () => {
    it('should return false when debt is below threshold', () => {
      account = { ...account, currentDebt: 59 };
      expect(service.isBankrupt(account)).toBe(false);
    });

    it('should return true when debt reaches threshold', () => {
      account = { ...account, currentDebt: 60 };
      expect(service.isBankrupt(account)).toBe(true);
    });

    it('should return true when debt exceeds threshold', () => {
      account = { ...account, currentDebt: 100 };
      expect(service.isBankrupt(account)).toBe(true);
    });
  });

  describe('calculateBankruptcyEndTime', () => {
    it('should calculate end time correctly', () => {
      const before = Date.now();
      const endTime = service.calculateBankruptcyEndTime(24);
      const after = Date.now();

      expect(endTime).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
      expect(endTime).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
    });
  });

  describe('legacy field migration', () => {
    it('should handle legacy totalAccrued field', () => {
      const legacyAccount = {
        ...account,
        totalAccrued: 100,
        totalRepaid: 50,
      } as DebtAccount & { totalAccrued?: number; totalRepaid?: number };

      // Simulate migration
      const migratedAccount = {
        ...legacyAccount,
        totalEntertainmentMinutes: legacyAccount.totalAccrued || 0,
        totalLearningMinutes: legacyAccount.totalRepaid || 0,
      };
      delete (migratedAccount as { totalAccrued?: number }).totalAccrued;
      delete (migratedAccount as { totalRepaid?: number }).totalRepaid;

      expect(migratedAccount.totalEntertainmentMinutes).toBe(100);
      expect(migratedAccount.totalLearningMinutes).toBe(50);
      expect((migratedAccount as { totalAccrued?: number }).totalAccrued).toBeUndefined();
      expect((migratedAccount as { totalRepaid?: number }).totalRepaid).toBeUndefined();
    });
  });
});
