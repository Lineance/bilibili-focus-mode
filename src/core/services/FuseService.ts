import type { ExtensionConfig } from '@core/types';

export class FuseService {
  constructor(private readonly config: ExtensionConfig) {}

  generateFuseCode(length: number): string {
    const bytes = new Uint8Array(length / 2);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    
    // Format as XXXX-XXXX-XXXX-XXXX
    return hex.match(/.{1,4}/g)?.join('-') || hex;
  }

  calculateFuseLength(recentApps: number, within10Minutes: boolean): number {
    if (!this.config.dynamicFuseEnabled) {
      return this.config.baseFuseLength;
    }

    let length = this.config.baseFuseLength;

    if (recentApps >= 3) {
      length = 64;
    } else if (recentApps === 2) {
      length = 32;
    } else if (recentApps === 1 && within10Minutes) {
      length = 16;
    }

    return Math.min(length, this.config.maxFuseLength);
  }

  calculateBankruptcyFuse(remainingMinutes: number): number {
    return Math.min(
      64 + (remainingMinutes / 60) * 2,
      this.config.bankruptcyOverrideMaxFuse
    );
  }

  verifyFuseCode(input: string, expected: string): boolean {
    return input.replace(/-/g, '').toUpperCase() === expected.replace(/-/g, '').toUpperCase();
  }
}
