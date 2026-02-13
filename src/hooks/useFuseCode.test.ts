import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFuseCode } from './useFuseCode';

// Mock crypto.getRandomValues
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
  },
});

describe('useFuseCode', () => {
  it('should generate initial fuse code', () => {
    const { result } = renderHook(() => useFuseCode(8));
    
    expect(result.current.fuseCode).toBeTruthy();
    expect(result.current.fuseCode.length).toBeGreaterThan(0);
    expect(result.current.isVerified).toBe(false);
  });

  it('should verify correct code', () => {
    const { result } = renderHook(() => useFuseCode(8));
    
    const correctCode = result.current.fuseCode;
    
    act(() => {
      const isValid = result.current.verify(correctCode);
      expect(isValid).toBe(true);
    });
    
    expect(result.current.isVerified).toBe(true);
  });

  it('should reject incorrect code', () => {
    const { result } = renderHook(() => useFuseCode(8));
    
    act(() => {
      const isValid = result.current.verify('WRONG-CODE');
      expect(isValid).toBe(false);
    });
    
    expect(result.current.isVerified).toBe(false);
  });

  it('should verify code ignoring case and dashes', () => {
    const { result } = renderHook(() => useFuseCode(8));
    
    const code = result.current.fuseCode;
    const lowerCaseCode = code.toLowerCase();
    
    act(() => {
      expect(result.current.verify(lowerCaseCode)).toBe(true);
    });
    
    // Regenerate and test no-dash
    act(() => {
      result.current.regenerate();
    });
    
    const newCode = result.current.fuseCode;
    act(() => {
      expect(result.current.verify(newCode.replace(/-/g, ''))).toBe(true);
    });
  });

  it('should regenerate new code', () => {
    const { result } = renderHook(() => useFuseCode(8));
    
    const oldCode = result.current.fuseCode;
    
    act(() => {
      result.current.verify(oldCode);
    });
    
    expect(result.current.isVerified).toBe(true);
    
    act(() => {
      result.current.regenerate();
    });
    
    expect(result.current.isVerified).toBe(false);
    expect(result.current.fuseCode).not.toBe(oldCode);
  });

  it('should generate code with specified length', () => {
    const { result: result16 } = renderHook(() => useFuseCode(16));
    const { result: result32 } = renderHook(() => useFuseCode(32));
    
    // Codes should be different lengths (accounting for dashes)
    expect(result16.current.fuseCode.length).toBeLessThan(result32.current.fuseCode.length);
  });
});
