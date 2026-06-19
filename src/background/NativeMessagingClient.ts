import { logger } from '@core/utils/logger';

const HOST_NAME = 'com.bilibili.focus.monitor';
const HEARTBEAT_INTERVAL_MS = 15000;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 60000;
const MAX_RECONNECT_ATTEMPTS = 10;
const DEBUG = false; // 生产环境关闭详细日志

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface NativeMessage {
  type: string;
  payload?: unknown;
  timestamp?: number;
}

export class NativeMessagingClient {
  private port: chrome.runtime.Port | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private listeners: Map<string, ((message: NativeMessage) => void)[]> = new Map();

  /**
   * Connect to native messaging host
   */
  connect(): void {
    if (this.state === 'connecting' || this.state === 'connected') {
      if (DEBUG) logger.debug('NativeMessaging', 'Already connected or connecting');
      return;
    }

    // 检查最大重连次数
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.warn('NativeMessaging', `Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached, giving up`);
      this.state = 'error';
      return;
    }

    this.state = 'connecting';
    logger.info('NativeMessaging', 'Connecting to host:', HOST_NAME);

    try {
      this.port = chrome.runtime.connectNative(HOST_NAME);

      this.port.onMessage.addListener((message: unknown) => {
        if (DEBUG) logger.debug('NativeMessaging', 'Message received:', message);
        this.handleMessage(message as NativeMessage);
      });

      this.port.onDisconnect.addListener(() => {
        const lastError = chrome.runtime.lastError;
        if (DEBUG) logger.debug('NativeMessaging', 'Port disconnected, error:', lastError);
        this.handleDisconnect();
      });

      // If we get here, connection succeeded
      this.state = 'connected';
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      logger.info('NativeMessaging', 'Connected to host successfully');
    } catch (error) {
      this.state = 'error';
      logger.error('NativeMessaging', 'Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from native messaging host
   */
  disconnect(): void {
    if (DEBUG) logger.debug('NativeMessaging', 'Disconnecting');
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }

    this.state = 'disconnected';
  }

  /**
   * Send message to native host
   */
  send(message: NativeMessage): boolean {
    if (this.state !== 'connected' || !this.port) {
      if (DEBUG) logger.debug('NativeMessaging', 'Not connected, cannot send');
      return false;
    }

    try {
      this.port.postMessage({
        ...message,
        timestamp: Date.now(),
      });
      return true;
    } catch (error) {
      logger.error('NativeMessaging', 'Failed to send message:', error);
      return false;
    }
  }

  /**
   * Add listener for specific message type
   */
  on(type: string, callback: (message: NativeMessage) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  /**
   * Remove listener
   */
  off(type: string, callback: (message: NativeMessage) => void): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  private handleMessage(message: NativeMessage): void {
    logger.debug('NativeMessaging', 'Received:', message.type);

    // Notify type-specific listeners
    const callbacks = this.listeners.get(message.type);
    if (callbacks) {
      callbacks.forEach(cb => cb(message));
    }

    // Notify wildcard listeners
    const wildcardCallbacks = this.listeners.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach(cb => cb(message));
    }
  }

  private handleDisconnect(): void {
    const lastError = chrome.runtime.lastError;
    logger.debug('NativeMessaging', 'Disconnected:', lastError?.message || 'unknown reason');

    this.stopHeartbeat();
    this.port = null;
    this.state = 'disconnected';

    // Notify disconnect listeners
    this.handleMessage({ type: 'disconnected' });

    // Schedule reconnect
    this.scheduleReconnect();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY_MS
    );

    logger.debug('NativeMessaging', `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
