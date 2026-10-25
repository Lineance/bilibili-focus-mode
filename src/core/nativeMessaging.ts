export const NATIVE_HOST_NAME = 'com.bilibili.focus.monitor';
export const NATIVE_PROTOCOL_VERSION = 1;
export const NATIVE_RECOVERY_ALARM = 'native-monitor-recovery';
export const NATIVE_STATUS_KEY = 'nativeMonitorStatus';

export type NativeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type MonitorState = 'idle' | 'awaitingExtension' | 'monitoring' | 'gracePeriod' | 'closing' | 'terminating' | 'paused' | 'faulted' | 'wouldClose';

export interface NativeMonitorStatus {
  protocolVersion: number;
  watchdogRunning: boolean;
  state: MonitorState;
  enabled: boolean;
  dryRun: boolean;
  extensionConnected: boolean;
  verified: boolean;
  targetPid: number | null;
  remainingMs: number | null;
  reason: string | null;
  updatedAt: number;
}

export interface NativeConnectionSnapshot {
  state: NativeConnectionState;
  reason: string | null;
  monitor: NativeMonitorStatus | null;
  updatedAt: number;
}

export interface NativeMessage {
  type: string;
  payload?: unknown;
  timestamp?: number;
}

const MONITOR_STATES: readonly string[] = ['idle', 'awaitingExtension', 'monitoring', 'gracePeriod', 'closing', 'terminating', 'paused', 'faulted', 'wouldClose'];

/** Validate messages at the native boundary before displaying protection status. */
export function isNativeMonitorStatus(value: unknown): value is NativeMonitorStatus {
  if (typeof value !== 'object' || value === null) return false;
  const status = value as Record<string, unknown>;
  return status.protocolVersion === NATIVE_PROTOCOL_VERSION
    && typeof status.watchdogRunning === 'boolean'
    && typeof status.enabled === 'boolean' && typeof status.dryRun === 'boolean'
    && typeof status.extensionConnected === 'boolean' && typeof status.verified === 'boolean'
    && typeof status.state === 'string' && MONITOR_STATES.includes(status.state)
    && (status.reason === null || typeof status.reason === 'string')
    && (status.targetPid === null || (typeof status.targetPid === 'number' && Number.isInteger(status.targetPid) && status.targetPid > 0))
    && (status.remainingMs === null || (typeof status.remainingMs === 'number' && Number.isFinite(status.remainingMs) && status.remainingMs >= 0))
    && typeof status.updatedAt === 'number' && Number.isFinite(status.updatedAt);
}

/** Only fresh background snapshots should replace the manager's current state. */
export function isNativeConnectionSnapshot(value: unknown): value is NativeConnectionSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const snapshot = value as Record<string, unknown>;
  return ['disconnected', 'connecting', 'connected', 'error'].includes(String(snapshot.state))
    && (snapshot.reason === null || typeof snapshot.reason === 'string')
    && (snapshot.monitor === null || isNativeMonitorStatus(snapshot.monitor))
    && typeof snapshot.updatedAt === 'number' && Number.isFinite(snapshot.updatedAt);
}
