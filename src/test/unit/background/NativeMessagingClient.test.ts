import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NativeMessagingClient } from '@background/NativeMessagingClient';

vi.mock('@core/utils/logger', () => ({ logger: { warn: vi.fn() } }));

interface TestPort {
  postMessage: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  message: (value: unknown) => void;
  close: () => void;
}

function createPort(): TestPort & { value: chrome.runtime.Port } {
  const port: TestPort = {
    postMessage: vi.fn(), disconnect: vi.fn(), message: () => {}, close: () => {},
  };
  return Object.assign(port, {
    value: {
      postMessage: port.postMessage,
      disconnect: port.disconnect,
      onMessage: { addListener: (callback: (value: unknown) => void) => { port.message = callback; } },
      onDisconnect: { addListener: (callback: () => void) => { port.close = callback; } },
    } as unknown as chrome.runtime.Port,
  });
}

const ready = { type: 'ready', payload: { protocolVersion: 1, watchdogReady: true, sessionId: 'session-1' } };

// These tests focus on asynchronous native failures and races that a Port mock
// returning successfully would otherwise hide.
describe('NativeMessagingClient', () => {
  let ports: ReturnType<typeof createPort>[];
  let client: NativeMessagingClient;
  let connectNative: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'] });
    ports = [];
    connectNative = vi.fn(() => {
      const port = createPort();
      ports.push(port);
      return port.value;
    });
    vi.stubGlobal('chrome', { runtime: { connectNative, lastError: undefined } });
    client = new NativeMessagingClient();
  });

  afterEach(() => {
    client.disconnect();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should wait for watchdog ready instead of trusting Port creation', () => {
    client.connect();
    expect(client.getState()).toBe('connecting');
    expect(ports[0].postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'hello', payload: { protocolVersion: 1 } }));
    ports[0].message(ready);
    expect(client.isConnected()).toBe(true);
  });

  it('should reject malformed ready and an unavailable watchdog', () => {
    client.connect();
    ports[0].message(null);
    ports[0].message({ type: 'ready', payload: { protocolVersion: 1, watchdogReady: false } });
    expect(client.getState()).toBe('error');
    expect(ports[0].disconnect).toHaveBeenCalledOnce();
  });

  it('should time out a native process that never finishes its handshake', () => {
    client.connect();
    vi.advanceTimersByTime(5000);
    expect(client.getState()).toBe('error');
    vi.advanceTimersByTime(1000);
    expect(connectNative).toHaveBeenCalledTimes(2);
  });

  it('should increase backoff across asynchronously failed Port creations', () => {
    client.connect();
    ports[0].close();
    vi.advanceTimersByTime(1000);
    ports[1].close();
    vi.advanceTimersByTime(1999);
    expect(connectNative).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(connectNative).toHaveBeenCalledTimes(3);
  });

  it('should ignore messages and disconnection events from replaced Ports', () => {
    client.connect();
    const old = ports[0];
    old.close();
    vi.advanceTimersByTime(1000);
    ports[1].message(ready);
    old.close();
    old.message({ type: 'ready', payload: {} });
    expect(client.isConnected()).toBe(true);
    expect(ports[1].disconnect).not.toHaveBeenCalled();
  });

  it('should keep a connection healthy only with matching heartbeat responses', () => {
    client.connect();
    ports[0].message(ready);
    for (let sequence = 1; sequence <= 8; sequence++) {
      vi.advanceTimersByTime(15000);
      ports[0].message({ type: 'pong', payload: { sessionId: 'session-1', sequence } });
    }
    expect(client.isConnected()).toBe(true);
    expect(ports[0].postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'heartbeat', payload: { sessionId: 'session-1', sequence: 8 } }));
  });

  it('should time out wrong-session, duplicate and unsolicited pongs', () => {
    client.connect();
    ports[0].message(ready);
    ports[0].message({ type: 'pong', payload: { sessionId: 'session-1', sequence: 99 } });
    vi.advanceTimersByTime(15000);
    ports[0].message({ type: 'pong', payload: { sessionId: 'session-1', sequence: 1 } });
    vi.advanceTimersByTime(15000);
    ports[0].message({ type: 'pong', payload: { sessionId: 'wrong', sequence: 2 } });
    vi.advanceTimersByTime(15000);
    ports[0].message({ type: 'pong', payload: { sessionId: 'session-1', sequence: 1 } });
    vi.advanceTimersByTime(15000);
    expect(client.getState()).toBe('error');
  });

  it('should cancel pending retries on manual disconnect', () => {
    client.connect();
    ports[0].close();
    client.disconnect();
    vi.advanceTimersByTime(120000);
    expect(connectNative).toHaveBeenCalledOnce();
    expect(client.getState()).toBe('disconnected');
  });

  it('should expose verified monitor state and clear it as soon as the Port is lost', () => {
    client.connect();
    const monitor = {
      protocolVersion: 1, watchdogRunning: true, state: 'monitoring', enabled: true,
      dryRun: false, extensionConnected: true, verified: true, targetPid: 123,
      remainingMs: null, reason: null, updatedAt: 100,
    };
    ports[0].message({ ...ready, payload: { ...ready.payload, monitor } });
    expect(client.getSnapshot().monitor).toEqual(monitor);
    ports[0].close();
    expect(client.getSnapshot()).toMatchObject({ state: 'error', monitor: null });
  });

  it('should not trust a malformed protection status in an otherwise valid handshake', () => {
    client.connect();
    ports[0].message({ ...ready, payload: { ...ready.payload, monitor: { enabled: true, state: 'monitoring' } } });
    expect(client.isConnected()).toBe(true);
    expect(client.getSnapshot().monitor).toBeNull();
  });

  it('should reset retry backoff only after a successful ready response', () => {
    client.connect();
    ports[0].close();
    vi.advanceTimersByTime(1000);
    ports[1].message(ready);
    ports[1].close();
    vi.advanceTimersByTime(1000);
    expect(connectNative).toHaveBeenCalledTimes(3);
  });
});
