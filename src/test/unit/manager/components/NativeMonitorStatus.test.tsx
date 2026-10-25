import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NativeConnectionSnapshot, NativeMonitorStatus as MonitorStatus } from '@core/nativeMessaging';
import { NativeMonitorStatus } from '@manager/components/config/NativeMonitorStatus';

let status: NativeConnectionSnapshot;
vi.mock('@hooks/useNativeMonitor', () => ({ useNativeMonitor: () => ({ status, refresh: vi.fn() }) }));

const monitor: MonitorStatus = {
  protocolVersion: 1, watchdogRunning: true, state: 'monitoring', enabled: true,
  dryRun: false, extensionConnected: true, verified: true, targetPid: 123,
  remainingMs: null, reason: null, updatedAt: 100,
};

describe('NativeMonitorStatus', () => {
  beforeEach(() => { status = { state: 'connected', reason: null, monitor, updatedAt: 100 }; });
  afterEach(cleanup);

  it('should show communication and actual protection separately', () => {
    render(<NativeMonitorStatus />);
    expect(screen.getByText('外部连接：已连接')).toBeDefined();
    expect(screen.getByText('保护状态：保护运行中')).toBeDefined();
  });

  it('should never label a dry run as actual protection', () => {
    status = { ...status, monitor: { ...monitor, dryRun: true } };
    render(<NativeMonitorStatus />);
    expect(screen.getByText('保护状态：模拟模式，未启用实际关闭')).toBeDefined();
    expect(screen.queryByText('保护状态：保护运行中')).toBeNull();
  });

  it('should require the enabled and verified flags before claiming actual protection', () => {
    status = { ...status, monitor: { ...monitor, enabled: false, verified: false } };
    render(<NativeMonitorStatus />);
    expect(screen.getByText('保护状态：本地保护已暂停')).toBeDefined();
    expect(screen.queryByText('保护状态：保护运行中')).toBeNull();
  });

  it('should not display cached protection after a native disconnect', () => {
    status = { ...status, state: 'error', reason: 'Native host has exited' };
    render(<NativeMonitorStatus />);
    expect(screen.getByText('保护状态：尚未确认，请检查本地监控程序')).toBeDefined();
    expect(screen.getByText('Native host has exited')).toBeDefined();
  });
});
