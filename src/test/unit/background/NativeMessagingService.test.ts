import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { onMessage } from 'webext-bridge/background';
import { NativeMessagingClient } from '@background/NativeMessagingClient';
import { NativeMessagingService } from '@background/NativeMessagingService';
import { NATIVE_RECOVERY_ALARM } from '@core/nativeMessaging';

vi.mock('webext-bridge/background', () => ({ onMessage: vi.fn() }));
vi.mock('@core/utils/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

describe('NativeMessagingService', () => {
  let config: unknown;
  let client: NativeMessagingClient;
  let service: NativeMessagingService;
  let configChanged: (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;
  let alarmFired: (alarm: chrome.alarms.Alarm) => void;
  let startup: () => void;
  let get: ReturnType<typeof vi.fn>;
  let clear: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    config = { nativeMessagingEnabled: true };
    get = vi.fn(async () => ({ config }));
    clear = vi.fn(async () => true);
    create = vi.fn(async () => {});
    vi.stubGlobal('chrome', {
      storage: {
        local: { get, set: vi.fn(async () => {}) },
        onChanged: { addListener: (listener: typeof configChanged) => { configChanged = listener; } },
      },
      runtime: {
        onStartup: { addListener: (listener: typeof startup) => { startup = listener; } },
        onInstalled: { addListener: vi.fn() },
      },
      alarms: { create, clear, onAlarm: { addListener: (listener: typeof alarmFired) => { alarmFired = listener; } } },
    });
    client = new NativeMessagingClient();
    vi.spyOn(client, 'connect').mockImplementation(() => {});
    vi.spyOn(client, 'disconnect').mockImplementation(() => {});
    vi.spyOn(client, 'send').mockReturnValue(true);
    service = new NativeMessagingService(client);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('should restore a cold worker and create a durable one-minute recovery alarm', async () => {
    service.start();
    await vi.waitFor(() => expect(client.connect).toHaveBeenCalledOnce());
    expect(create).toHaveBeenCalledWith(NATIVE_RECOVERY_ALARM, { periodInMinutes: 1 });
  });

  it('should disable communication and clear recovery on config removal', async () => {
    service.start();
    await vi.waitFor(() => expect(client.connect).toHaveBeenCalledOnce());
    configChanged({ config: { oldValue: config, newValue: undefined } }, 'local');
    expect(client.disconnect).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledWith(NATIVE_RECOVERY_ALARM);
  });

  it('should ignore an old initialization read after the user disables communication', async () => {
    let resolveRead: (value: { config: unknown }) => void = () => {};
    get.mockImplementationOnce(() => new Promise((resolve) => { resolveRead = resolve; }));
    service.start();
    configChanged({ config: { newValue: { nativeMessagingEnabled: false } } }, 'local');
    resolveRead({ config: { nativeMessagingEnabled: true } });
    await Promise.resolve();
    expect(client.connect).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('should recover through an alarm after the worker loses its timers', async () => {
    service.start();
    await vi.waitFor(() => expect(client.connect).toHaveBeenCalledOnce());
    alarmFired({ name: NATIVE_RECOVERY_ALARM } as chrome.alarms.Alarm);
    await vi.waitFor(() => expect(client.connect).toHaveBeenCalledTimes(2));
  });

  it('should read the latest config on browser startup instead of cached state', async () => {
    service.start();
    await vi.waitFor(() => expect(client.connect).toHaveBeenCalledOnce());
    config = { nativeMessagingEnabled: false };
    startup();
    await vi.waitFor(() => expect(client.disconnect).toHaveBeenCalledOnce());
  });

  it('should query status through the existing Port without creating a second native client', async () => {
    service.start();
    await vi.waitFor(() => expect(client.connect).toHaveBeenCalledOnce());
    const handler = vi.mocked(onMessage).mock.calls.find(([name]) => name === 'native-monitor-status')?.[1];
    expect(handler).toBeDefined();
    const result = (handler as unknown as (message: { data: unknown }) => unknown)({ data: { refresh: true } });
    expect(client.send).toHaveBeenCalledWith({ type: 'status-request' });
    expect(result).toEqual({ ...service.getSnapshot(), updatedAt: expect.any(Number) });
  });

  it('should remove an alarm whose creation completes after communication is disabled', async () => {
    let finishCreate: () => void = () => {};
    create.mockImplementationOnce(() => new Promise<void>((resolve) => { finishCreate = resolve; }));
    service.start();
    await vi.waitFor(() => expect(client.connect).toHaveBeenCalledOnce());
    configChanged({ config: { newValue: { nativeMessagingEnabled: false } } }, 'local');
    finishCreate();
    await vi.waitFor(() => expect(clear).toHaveBeenCalledTimes(2));
  });

  it('should ignore unrelated storage areas and business alarms', async () => {
    service.start();
    await vi.waitFor(() => expect(client.connect).toHaveBeenCalledOnce());
    configChanged({ config: { newValue: { nativeMessagingEnabled: false } } }, 'sync');
    alarmFired({ name: 'limbo-review-reminder' } as chrome.alarms.Alarm);
    expect(client.connect).toHaveBeenCalledOnce();
    expect(client.disconnect).not.toHaveBeenCalled();
  });
});
