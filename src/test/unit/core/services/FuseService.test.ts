import { describe, it, expect, beforeEach } from 'vitest';
import { FuseService } from '@core/services/';
import { DEFAULT_CONFIG } from '@core/constants';
import type { ExtensionConfig } from '@core/types';

describe('FuseService', () => {
  let service: FuseService;
  let config: ExtensionConfig;

  beforeEach(() => {
    config = { ...DEFAULT_CONFIG };
    service = new FuseService(config);
  });

  describe('generateFuseCode', () => {
    it('should generate fuse code of correct length', () => {
      const code = service.generateFuseCode(8);
      const normalized = code.replace(/-/g, '');
      expect(normalized.length).toBe(8);
    });

    it('should generate unique codes', () => {
      const code1 = service.generateFuseCode(8);
      const code2 = service.generateFuseCode(8);
      expect(code1).not.toBe(code2);
    });

    it('should format code with dashes', () => {
      const code = service.generateFuseCode(16);
      expect(code).toMatch(/^[A-F0-9]{4}(?:-[A-F0-9]{4})+$/);
    });
  });

  describe('calculateFuseLength', () => {
    it('should return base length when dynamic fuse is disabled', () => {
      const testConfig = { ...config, dynamicFuseEnabled: false };
      service = new FuseService(testConfig);

      const length = service.calculateFuseLength(5, false);
      expect(length).toBe(config.baseFuseLength);
    });

    it('should increase length with recent applications', () => {
      expect(service.calculateFuseLength(0, false)).toBe(8);
      expect(service.calculateFuseLength(1, true)).toBe(16);
      expect(service.calculateFuseLength(2, false)).toBe(32);
      expect(service.calculateFuseLength(3, false)).toBe(64);
    });

    it('should not exceed max fuse length', () => {
      const testConfig = { ...config, maxFuseLength: 32 };
      service = new FuseService(testConfig);

      const length = service.calculateFuseLength(5, false);
      expect(length).toBe(32);
    });
  });

  describe('calculateBankruptcyFuse', () => {
    it('should calculate bankruptcy fuse based on remaining time', () => {
      // 12 hours remaining
      const length = service.calculateBankruptcyFuse(12 * 60);
      expect(length).toBe(64 + 24); // 64 + 12*2
    });

    it('should not exceed max bankruptcy fuse length', () => {
      const testConfig = { ...config, bankruptcyOverrideMaxFuse: 100 };
      service = new FuseService(testConfig);

      const length = service.calculateBankruptcyFuse(24 * 60);
      expect(length).toBeLessThanOrEqual(100);
    });
  });

  describe('verifyFuseCode', () => {
    it('should verify correct code', () => {
      const code = 'ABCD-1234-EFGH-5678';
      expect(service.verifyFuseCode(code, code)).toBe(true);
    });

    it('should verify code ignoring dashes and case', () => {
      expect(service.verifyFuseCode('abcd-1234', 'ABCD1234')).toBe(true);
      expect(service.verifyFuseCode('ABCD-1234', 'abcd1234')).toBe(true);
    });

    it('should reject incorrect code', () => {
      expect(service.verifyFuseCode('ABCD-1234', 'WXYZ-9999')).toBe(false);
    });
  });
});
