import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePermission } from '@hooks/usePermission';
import type { PermissionResult } from '@core/types';

// Mock webext-bridge
const mockSendMessage = vi.fn();

vi.mock('webext-bridge/content-script', () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

describe('usePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not check permission when bvid is null', () => {
    const { result } = renderHook(() => usePermission(null));
    
    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('should check permission when bvid is provided', async () => {
    const mockResult: PermissionResult = { allowed: true, reason: 'PERMANENT' };
    mockSendMessage.mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => usePermission('BV1xx'));

    // Should be loading initially
    expect(result.current.loading).toBe(true);

    // Wait for the check to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      'check-permission',
      expect.objectContaining({ bvid: 'BV1xx' })
    );
    expect(result.current.result).toEqual(mockResult);
    expect(result.current.error).toBeNull();
  });

  it('should handle permission denied', async () => {
    const mockResult: PermissionResult = { allowed: false, reason: 'NO_PERMISSION' };
    mockSendMessage.mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => usePermission('BV2xx'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.result).toEqual(mockResult);
    expect(result.current.result?.allowed).toBe(false);
  });

  it('should handle errors', async () => {
    mockSendMessage.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePermission('BV3xx'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.result).toBeNull();
  });

  it('should recheck when bvid changes', async () => {
    mockSendMessage
      .mockResolvedValueOnce({ allowed: true, reason: 'PERMANENT' } as PermissionResult)
      .mockResolvedValueOnce({ allowed: false, reason: 'COOLING_WAITING' } as PermissionResult);

    const { result, rerender } = renderHook(
      ({ bvid }) => usePermission(bvid),
      { initialProps: { bvid: 'BV1xx' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.result?.allowed).toBe(true);

    // Change bvid
    rerender({ bvid: 'BV2xx' });

    await waitFor(() => {
      expect(result.current.result?.allowed).toBe(false);
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
  });
});
