/* global process, console, WebSocket, setTimeout, clearTimeout */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash, generateKeyPairSync, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, closeSync, openSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../..');
const runDir = join(directory, 'artifacts', `run-${Date.now()}-中文 space`);
mkdirSync(runDir, { recursive: true });
const browser = process.argv[2] ?? join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1248/chrome-win64/chrome.exe');
assert(existsSync(browser), `Browser not found: ${browser}`);
const executable = join(directory, 'target/debug/native-monitor-probe.exe');
assert(existsSync(executable), 'Build the Rust probe first');
const fixture = join(runDir, 'extension');
const profile = join(runDir, 'browser-profile');
mkdirSync(fixture);
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'der' });
const extensionId = [...createHash('sha256').update(key).digest().subarray(0, 16)]
  .map(byte => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join('');
const hostName = 'com.bilibili.focus.probe';
const registryKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${hostName}`;
const configPath = join(runDir, 'config.json');
const config = { pipeName: `\\\\.\\pipe\\bilibili-focus-probe-${randomUUID()}`, browser, userDataDir: profile,
  extensionId, startupSeconds: 10, graceSeconds: 5, heartbeatTimeoutSeconds: 45 };
writeFileSync(configPath, JSON.stringify(config, null, 2));
const environment = { ...process.env, FOCUS_PROBE_CONFIG: configPath };
const results = [];
const python = process.env.FOCUS_PROBE_PYTHON ?? 'python';
const children = new Set();
let registered = false;
let watchdog;
let browserChild;
let cdp;
let pageSession;
let extensionsSession;
let unrelatedBrowser;

function readRegistration() {
  // reg.exe output uses the Windows console code page; JSON from Python keeps
  // Unicode paths intact when checking ownership and cleaning up the test key.
  const result = spawnSync(python, ['-c', `import json,sys,winreg
try:
 with winreg.OpenKey(winreg.HKEY_CURRENT_USER,sys.argv[1],0,winreg.KEY_READ|winreg.KEY_WOW64_64KEY) as key:
  print(json.dumps(winreg.QueryValueEx(key,'')[0]))
except FileNotFoundError:
 print('null')`, registryKey.slice(5)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function report(name, detail) {
  const result = { name, detail, timestamp: new Date().toISOString() };
  results.push(result);
  writeFileSync(join(runDir, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(result));
}
function events() {
  const path = join(runDir, 'events.jsonl');
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  return text.slice(0, text.lastIndexOf('\n') + 1).split('\n').filter(Boolean).map(line => JSON.parse(line));
}
async function until(test, description, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try { const result = await test(); if (result) return result; } catch (error) { lastError = error; }
    await delay(150);
  }
  throw new Error(`Timed out: ${description}${lastError ? ` (${lastError.message})` : ''}`);
}
function launch(command, args, name) {
  const output = openSync(join(runDir, `${name}.log`), 'a');
  const child = spawn(command, args, { env: environment, stdio: ['ignore', output, output], windowsHide: true });
  closeSync(output);
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}
class CDP {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result);
    });
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('CDP socket closed'));
      }
      this.pending.clear();
    });
  }
  call(method, params = {}, sessionId) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  async page(url) {
    const { targetId } = await this.call('Target.createTarget', { url });
    return (await this.call('Target.attachToTarget', { targetId, flatten: true })).sessionId;
  }
  async evaluate(expression, sessionId) {
    const result = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  close() { this.socket.close(); }
}
function transpile(source, destination, replacements = []) {
  let text = readFileSync(join(root, source), 'utf8');
  for (const [from, to] of replacements) text = text.replaceAll(from, to);
  writeFileSync(join(fixture, destination), ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText);
}
transpile('src/background/NativeMessagingClient.ts', 'NativeMessagingClient.js', [['@core/utils/logger', './logger.js'], ['@core/nativeMessaging', './nativeMessaging.js']]);
transpile('src/core/nativeMessaging.ts', 'nativeMessaging.js');
transpile('src/core/utils/logger.ts', 'logger.js');
writeFileSync(join(fixture, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Focus Native Messaging Feasibility Probe',
  version: '0.0.0', key: key.toString('base64'), minimum_chrome_version: '105', permissions: ['nativeMessaging', 'storage'],
  background: { service_worker: 'background.js', type: 'module' } }, null, 2));
const echoText = '中文 / 空格 / \n';
const echoBaseBytes = Buffer.byteLength(JSON.stringify({ type: 'probe-echo', payload: { text: echoText, padding: '' } }));
const echoPayload = { text: echoText, padding: 'x'.repeat((266 - echoBaseBytes + 256) % 256) };
assert.equal(Buffer.byteLength(JSON.stringify({ type: 'probe-echo', payload: echoPayload })), 266);
writeFileSync(join(fixture, 'background.js'), `
import { NativeMessagingClient } from './NativeMessagingClient.js';
const client = new NativeMessagingClient({hostName:'${hostName}'});
let messages = [];
client.on('*', async message => {
  messages = [...messages.slice(-39), {message, state:client.getState(), time:Date.now()}];
  await chrome.storage.local.set({probe:{state:client.getState(), messages}});
  if(message.type==='ready') client.send({type:'probe-echo',payload:${JSON.stringify(echoPayload)}});
});
chrome.runtime.onStartup.addListener(() => client.connect());
chrome.runtime.onInstalled.addListener(() => client.connect());
chrome.storage.onChanged.addListener((changes, area) => {
  if(area!=='local' || !changes.enabled) return;
  if(changes.enabled.newValue) client.connect(); else client.disconnect();
});
chrome.storage.local.get('enabled').then(({enabled}) => {if(enabled!==false) client.connect();});
`);
writeFileSync(join(fixture, 'probe.html'), '<!doctype html><meta charset="utf-8"><title>Probe control</title>Probe control');
const manifest = join(runDir, `${hostName}.json`);
writeFileSync(manifest, JSON.stringify({ name: hostName, description: 'Temporary dry-run feasibility probe', path: executable,
  type: 'stdio', allowed_origins: [`chrome-extension://${extensionId}/`] }, null, 2));

async function startBrowser() {
  browserChild = launch(browser, [`--user-data-dir=${profile}`, '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--remote-debugging-port=0', '--enable-unsafe-extension-debugging',
    `--disable-extensions-except=${fixture}`, `--load-extension=${fixture}`, 'about:blank'], `browser-${Date.now()}`);
  const portPath = join(profile, 'DevToolsActivePort');
  await until(() => existsSync(portPath), 'DevToolsActivePort');
  const [port, endpoint] = readFileSync(portPath, 'utf8').trim().split(/\r?\n/);
  const socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Cannot connect to CDP')), { once: true });
  });
  cdp = new CDP(socket);
  return cdp.call('Browser.getVersion');
}
async function extensionState(enabled) {
  return cdp.evaluate(`new Promise((resolve,reject)=>chrome.management.setEnabled('${extensionId}',${enabled},()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve(true)))`, extensionsSession);
}
async function readProbe() {
  return cdp.evaluate('chrome.storage.local.get("probe").then(x=>x.probe)', pageSession);
}
async function reconnectPages() {
  pageSession = await cdp.page(`chrome-extension://${extensionId}/probe.html`);
  extensionsSession = await cdp.page('chrome://extensions/');
  await until(() => cdp.evaluate('typeof chrome.developerPrivate?.updateExtensionConfiguration === "function"', extensionsSession), 'developerPrivate API');
  // Command-line loading bypasses this setting initially, but reload can disable
  // an unpacked extension if the isolated profile has developer mode turned off.
  await cdp.evaluate('chrome.developerPrivate.updateProfileConfiguration({inDeveloperMode:true})', extensionsSession);
}
async function closeBrowser() {
  const old = browserChild;
  await cdp.call('Browser.close');
  cdp.close();
  await until(() => old.exitCode !== null, 'test browser exit');
}

console.log(`Artifacts: ${runDir}`);
writeFileSync(join(directory, 'artifacts/latest-run.txt'), runDir);
try {
  assert.equal(readRegistration(), null, `Refusing to overwrite existing probe registration: ${registryKey}`);
  const installed = spawnSync('reg.exe', ['add', registryKey, '/ve', '/t', 'REG_SZ', '/d', manifest, '/f', '/reg:64'], { encoding: 'utf8' });
  assert.equal(installed.status, 0, installed.stderr);
  registered = true;
  assert.equal(readRegistration(), manifest);
  report('registration', { registryKey, manifest, extensionId, readback: true });
  watchdog = launch(executable, ['watch'], 'watchdog');
  await until(() => existsSync(join(runDir, 'watchdog-ready.json')), 'watchdog start');
  const version = await startBrowser();
  report('browser', version);
  await until(() => events().find(e => e.event === 'monitoring'), 'native handshake and browser association');
  await reconnectPages();
  const initial = await until(async () => {
    const probe = await readProbe();
    return probe?.messages.some(e => e.message.type === 'probe-echo') && probe;
  }, 'UTF-8 native echo');
  const connected = events().find(e => e.event === 'connected');
  assert.deepEqual(initial.messages.find(e => e.message.type === 'probe-echo').message.payload, echoPayload);
  assert.equal(connected.target.pid, browserChild.pid);
  unrelatedBrowser = launch(browser, [`--user-data-dir=${join(runDir, 'unrelated-profile')}`, '--headless=new',
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-extensions', 'about:blank'], 'unrelated-browser');
  report('handshake', { state: initial.state, hostArgs: connected.hostArgs, ancestors: connected.ancestors,
    target: connected.target, watchdogPid: watchdog.pid, unicodeEcho: true, nativeReplyBytes: 266, headerContains0A: true });

  // No CDP attachment is made to the service worker, including this idle period.
  const idleSeconds = Number(process.env.FOCUS_PROBE_IDLE_SECONDS ?? 65);
  await delay(idleSeconds * 1000);
  const heartbeats = events().filter(e => e.event === 'heartbeat');
  assert(heartbeats.length >= Math.floor(idleSeconds / 15));
  assert(!events().some(e => e.event === 'would_close'));
  report('idle-native-port', { durationSeconds: idleSeconds, heartbeats: heartbeats.length, workerDebuggerAttached: false });
  assert.equal(unrelatedBrowser.exitCode, null);
  assert(events().filter(e => e.event === 'browser_discovered').every(e => e.target.pid === browserChild.pid));
  report('instance-isolation', { targetPid: browserChild.pid, unrelatedPid: unrelatedBrowser.pid, unrelatedAlive: true });

  const beforeRecovery = events().length;
  await extensionState(false);
  await until(() => events().slice(beforeRecovery).find(e => e.event === 'grace_started'), 'temporary disable disconnect');
  await delay(1000);
  await extensionState(true);
  await until(() => events().slice(beforeRecovery).find(e => e.event === 'monitoring'), 'recovery inside grace period');
  await delay(5500);
  assert(!events().slice(beforeRecovery).some(e => e.event === 'would_close'));
  report('recover-inside-grace', { cancelledCountdown: true });

  const beforeDisable = events().length;
  await extensionState(false);
  const grace = await until(() => events().slice(beforeDisable).find(e => e.event === 'grace_started'), 'disable disconnect');
  const wouldClose = await until(() => events().slice(beforeDisable).find(e => e.event === 'would_close'), 'independent watchdog countdown');
  assert(watchdog.exitCode === null);
  assert.equal(unrelatedBrowser.exitCode, null);
  assert.equal(wouldClose.target.pid, browserChild.pid);
  assert(wouldClose.timestamp - grace.timestamp >= 5000);
  report('disable-countdown', { elapsedMs: wouldClose.timestamp - grace.timestamp, watchdogAlive: true, dryRun: true });

  const beforeEnable = events().length;
  await extensionState(true);
  await until(() => events().slice(beforeEnable).find(e => e.event === 'monitoring'), 'reenable handshake');
  report('reenable', { recovered: true });
  await reconnectPages();
  const beforeReload = events().length;
  await cdp.evaluate(`new Promise((resolve,reject)=>chrome.developerPrivate.reload('${extensionId}',{},()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve(true)))`, extensionsSession);
  await delay(1000);
  writeFileSync(join(runDir, 'reload-diagnostics.json'), JSON.stringify({
    targets: await cdp.call('Target.getTargets'),
    extension: await cdp.evaluate(`chrome.developerPrivate.getExtensionInfo('${extensionId}')`, extensionsSession),
  }, null, 2));
  await until(() => events().slice(beforeReload).find(e => e.event === 'monitoring'), 'reload recovery');
  await delay(5500);
  assert(!events().slice(beforeReload).some(e => e.event === 'would_close'));
  report('reload', { recoveredBeforeDeadline: true });

  const beforeUninstall = events().length;
  await cdp.call('Extensions.uninstall', { id: extensionId });
  const uninstallGrace = await until(() => events().slice(beforeUninstall).find(e => e.event === 'grace_started'), 'uninstall disconnect');
  const uninstallClose = await until(() => events().slice(beforeUninstall).find(e => e.event === 'would_close'), 'uninstall watchdog countdown');
  assert.equal(uninstallClose.target.pid, browserChild.pid);
  report('uninstall-countdown', { elapsedMs: uninstallClose.timestamp - uninstallGrace.timestamp, watchdogAlive: watchdog.exitCode === null });
  const beforeReinstall = events().length;
  const reinstalled = await cdp.call('Extensions.loadUnpacked', { path: fixture });
  assert.equal(reinstalled.id, extensionId);
  await until(() => events().slice(beforeReinstall).find(e => e.event === 'monitoring'), 'reinstall recovery');
  report('reinstall', { recovered: true });

  const beforeClose = events().length;
  await closeBrowser();
  await until(() => events().slice(beforeClose).find(e => e.event === 'browser_exit'), 'normal browser exit');
  await delay(5500);
  assert(!events().slice(beforeClose).some(e => e.event === 'would_close'));
  report('normal-exit', { cancelledCountdown: true, watchdogAlive: watchdog.exitCode === null });

  // Chromium command-line loaded extensions may be force-enabled on startup.
  // This restart omits --load-extension so the registered instance has no host.
  const beforeRestart = events().length;
  const output = openSync(join(runDir, 'browser-disabled-restart.log'), 'a');
  browserChild = spawn(browser, [`--user-data-dir=${profile}`, '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--remote-debugging-port=0', '--disable-extensions', 'about:blank'], { env: environment, stdio: ['ignore', output, output], windowsHide: true });
  closeSync(output);
  children.add(browserChild);
  browserChild.on('exit', () => children.delete(browserChild));
  const restart = await until(() => events().slice(beforeRestart).find(e => e.event === 'browser_discovered'), 'restart discovery without native host');
  const restartClose = await until(() => events().slice(beforeRestart).find(e => e.event === 'would_close'), 'startup grace expiration', 22000);
  assert(!events().slice(beforeRestart).some(e => e.event === 'connected'));
  assert.notEqual(restart.target.pid, connected.target.pid);
  report('restart-without-extension', { elapsedMs: restartClose.timestamp - restart.timestamp, target: restart.target, noNativeConnection: true });
  report('complete', { passed: true, dryRunOnly: true });
} catch (error) {
  report('failure', { message: error.message, stack: error.stack });
  process.exitCode = 1;
} finally {
  cdp?.close();
  writeFileSync(join(runDir, 'stop'), 'stop');
  if (browserChild?.exitCode === null) {
    // Cleanup is scoped to the test-owned root PID, never to browser image names.
    spawnSync('taskkill.exe', ['/PID', String(browserChild.pid), '/T', '/F'], { encoding: 'utf8' });
  }
  if (watchdog?.exitCode === null) await until(() => watchdog.exitCode !== null, 'watchdog stop', 3000).catch(() => watchdog.kill());
  for (const child of children) {
    if (child.exitCode === null) spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { encoding: 'utf8' });
  }
  if (registered) {
    if (readRegistration() === manifest) {
      const removed = spawnSync('reg.exe', ['delete', registryKey, '/f', '/reg:64'], { encoding: 'utf8' });
      assert.equal(removed.status, 0, removed.stderr);
    }
  }
  appendFileSync(join(runDir, 'cleanup.json'), JSON.stringify({ registryRemoved: spawnSync('reg.exe', ['query', registryKey, '/ve', '/reg:64']).status !== 0, timestamp: new Date().toISOString() }));
}
