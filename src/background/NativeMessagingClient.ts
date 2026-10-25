import { NATIVE_HOST_NAME, NATIVE_PROTOCOL_VERSION, isNativeMonitorStatus, type NativeConnectionState, type NativeConnectionSnapshot, type NativeMonitorStatus, type NativeMessage } from '@core/nativeMessaging';
import { logger } from '@core/utils/logger';
const HEARTBEAT_INTERVAL_MS = 15000;
const HANDSHAKE_TIMEOUT_MS = 5000;
const HEARTBEAT_TIMEOUT_MS = 45000;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 60000;

export type ConnectionState = NativeConnectionState;
export type { NativeMessage } from '@core/nativeMessaging';

export interface NativeConnectionOptions {
  hostName?: string;
}

function isNativeMessage(value: unknown): value is NativeMessage {
  return typeof value === 'object' && value !== null
    && 'type' in value && typeof value.type === 'string';
}

/** Owns one native Port; a ready response confirms that its watchdog is reachable. */
export class NativeMessagingClient {
  private port: chrome.runtime.Port | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private enabled = false;
  private generation = 0;
  private heartbeatSequence = 0;
  private acknowledgedSequence = 0;
  private lastPongAt = 0;
  private sessionId: string | null = null;
  private reason: string | null = null;
  private monitor: NativeMonitorStatus | null = null;
  private readonly hostName: string;
  private listeners = new Map<string, ((message: NativeMessage) => void)[]>();

  constructor(options: NativeConnectionOptions = {}) {
    this.hostName = options.hostName ?? NATIVE_HOST_NAME;
  }

  /** Start connecting; failed attempts remain recoverable until explicitly stopped. */
  connect(): void {
    this.enabled = true;
    if (this.state === 'connecting' || this.state === 'connected') return;
    this.clearReconnectTimer();
    const generation = ++this.generation;
    this.state = 'connecting';
    this.reason = null;
    this.notifyState();

    try {
      const port = chrome.runtime.connectNative(this.hostName);
      this.port = port;
      port.onMessage.addListener((message: unknown) => {
        if (generation !== this.generation || !isNativeMessage(message)) return;
        this.receive(message);
      });
      port.onDisconnect.addListener(() => {
        // lastError is only available inside the event callback.
        const error = chrome.runtime.lastError?.message;
        if (generation !== this.generation) return;
        this.fail(error ?? 'Native port disconnected');
      });
      this.handshakeTimer = setTimeout(() => {
        if (generation === this.generation) this.fail('Native handshake timed out');
      }, HANDSHAKE_TIMEOUT_MS);
      this.post({ type: 'hello', payload: { protocolVersion: NATIVE_PROTOCOL_VERSION } });
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    }
  }

  /** Stop all local connection attempts. This does not disable watchdog protection. */
  disconnect(): void {
    this.enabled = false;
    this.clearReconnectTimer();
    this.releasePort();
    this.state = 'disconnected';
    this.reason = null;
    this.notifyState();
  }

  /** Send an application message after a successful handshake. */
  send(message: NativeMessage): boolean {
    return this.state === 'connected' && this.post(message);
  }

  /** Subscribe to one message type, or '*' for all messages. */
  on(type: string, callback: (message: NativeMessage) => void): void {
    const callbacks = this.listeners.get(type) ?? [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }

  /** Remove an existing subscription. */
  off(type: string, callback: (message: NativeMessage) => void): void {
    const callbacks = this.listeners.get(type);
    const index = callbacks?.indexOf(callback) ?? -1;
    if (index >= 0) callbacks?.splice(index, 1);
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  /** Return connection and protection separately; a Port alone proves neither. */
  getSnapshot(): NativeConnectionSnapshot {
    return { state: this.state, reason: this.reason, monitor: this.monitor, updatedAt: Date.now() };
  }

  private notifyState(): void {
    this.emit({ type: 'connection-state', payload: this.getSnapshot() });
  }

  private post(message: NativeMessage): boolean {
    try {
      if (!this.port) return false;
      this.port.postMessage({ ...message, timestamp: Date.now() });
      return true;
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private receive(message: NativeMessage): void {
    if (message.type === 'ready' && this.state === 'connecting') {
      const payload = message.payload;
      if (typeof payload !== 'object' || payload === null
        || !('protocolVersion' in payload) || payload.protocolVersion !== NATIVE_PROTOCOL_VERSION
        || !('watchdogReady' in payload) || payload.watchdogReady !== true
        || !('sessionId' in payload) || typeof payload.sessionId !== 'string'
        || payload.sessionId.length === 0) {
        this.fail('Invalid native ready response');
        return;
      }
      if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
      this.sessionId = payload.sessionId;
      this.state = 'connected';
      this.reconnectAttempts = 0;
      this.heartbeatSequence = 0;
      this.acknowledgedSequence = 0;
      this.lastPongAt = performance.now();
      if ('monitor' in payload && isNativeMonitorStatus(payload.monitor)) this.monitor = payload.monitor;
      this.notifyState();
      this.heartbeatTimer = setInterval(() => {
        if (performance.now() - this.lastPongAt >= HEARTBEAT_TIMEOUT_MS) {
          this.fail('Native heartbeat timed out');
          return;
        }
        this.post({ type: 'heartbeat', payload: {
          sessionId: this.sessionId,
          sequence: ++this.heartbeatSequence,
        } });
      }, HEARTBEAT_INTERVAL_MS);
    } else if (message.type === 'pong' && this.state === 'connected') {
      const payload = message.payload;
      if (typeof payload !== 'object' || payload === null
        || !('sessionId' in payload) || payload.sessionId !== this.sessionId
        || !('sequence' in payload) || typeof payload.sequence !== 'number'
        || !Number.isInteger(payload.sequence)
        || payload.sequence <= this.acknowledgedSequence
        || payload.sequence > this.heartbeatSequence) return;
      this.acknowledgedSequence = payload.sequence;
      this.lastPongAt = performance.now();
      if ('monitor' in payload && isNativeMonitorStatus(payload.monitor)) this.monitor = payload.monitor;
      this.notifyState();
    } else if (message.type === 'status' && this.state === 'connected' && isNativeMonitorStatus(message.payload)) {
      this.monitor = message.payload;
      this.notifyState();
    }
    this.emit(message);
  }

  private emit(message: NativeMessage): void {
    for (const callback of [...(this.listeners.get(message.type) ?? []), ...(this.listeners.get('*') ?? [])]) {
      callback(message);
    }
  }

  private fail(reason: string): void {
    logger.warn('NativeMessaging', reason);
    this.releasePort();
    this.state = 'error';
    this.reason = reason;
    this.notifyState();
    this.emit({ type: 'disconnected', payload: { reason } });
    if (!this.enabled || this.reconnectTimer) return;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** Math.min(this.reconnectAttempts++, 6), RECONNECT_MAX_DELAY_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.enabled) this.connect();
    }, delay);
  }

  private releasePort(): void {
    ++this.generation;
    if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.handshakeTimer = null;
    this.heartbeatTimer = null;
    this.sessionId = null;
    this.monitor = null;
    const port = this.port;
    this.port = null;
    port?.disconnect();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
