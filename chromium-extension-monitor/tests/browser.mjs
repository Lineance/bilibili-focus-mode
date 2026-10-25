/* global process, console, WebSocket, setTimeout, clearTimeout */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const native = join(project, 'chromium-extension-monitor');
const run = join(native, 'artifacts', `acceptance-${Date.now()}-中文 space`);
mkdirSync(run, { recursive: true });
const browser = process.argv[2] ?? join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1248/chrome-win64/chrome.exe');
const cli = join(native, 'target', process.env.FOCUS_BUILD_PROFILE ?? 'debug', 'monitor.exe');
assert(existsSync(browser) && existsSync(cli), 'Build native binaries and supply a Chromium path');
const extension = join(run, 'extension');
function copyTree(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory()) copyTree(join(source, entry.name), join(destination, entry.name));
    else copyFileSync(join(source, entry.name), join(destination, entry.name));
  }
}
// Node 24's cpSync in this Windows environment mangles non-ASCII destination
// paths. Individual Unicode file APIs preserve the exact directory names.
copyTree(join(project, 'dist'), extension);
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'der' });
const extensionId = [...createHash('sha256').update(key).digest().subarray(0, 16)].map(byte => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join('');
const manifest = JSON.parse(readFileSync(join(extension, 'manifest.json'), 'utf8'));
manifest.key = key.toString('base64');
writeFileSync(join(extension, 'manifest.json'), JSON.stringify(manifest));
const data = join(run, 'native');
const profile = join(run, 'browser');
const results = [];
const children = new Set();
let registered = false;
let connection;
let browserChild;
let unrelated;
let management;
let appSession;

function record(name, detail) {
  results.push({ name, detail, timestamp: new Date().toISOString() });
  writeFileSync(join(run, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.at(-1)));
}
function command(args, expected = 0) {
  const result = spawnSync(cli, ['--data-dir', data, ...args], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, expected, `${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}
function status() { return command(['status']); }
async function until(check, description, timeout = 18000) {
  const end = Date.now() + timeout;
  let error;
  while (Date.now() < end) {
    try { const value = await check(); if (value) return value; } catch (caught) { error = caught; }
    await delay(150);
  }
  throw new Error(`Timed out: ${description}${error ? `: ${error.message}` : ''}`);
}
function launch(args, label) {
  const log = openSync(join(run, `${label}.log`), 'a');
  const child = spawn(browser, args, { stdio: ['ignore', log, log], windowsHide: true });
  closeSync(log);
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}
class CDP {
  constructor(socket) {
    this.socket = socket; this.next = 0; this.pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data); const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id); clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error))); else pending.resolve(message.result);
    });
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('browser closed')); }
      this.pending.clear();
    });
  }
  call(method, params = {}, sessionId) {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  async page(url) {
    const { targetId } = await this.call('Target.createTarget', { url });
    return (await this.call('Target.attachToTarget', { targetId, flatten: true })).sessionId;
  }
  async evaluate(expression, sessionId) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  close() { this.socket.close(); }
}
async function startBrowser() {
  connection?.close();
  const previousPort = join(profile, 'DevToolsActivePort');
  if (existsSync(previousPort)) unlinkSync(previousPort);
  assert(!existsSync(previousPort), 'Remove the previous DevTools endpoint before relaunch');
  browserChild = launch([`--user-data-dir=${profile}`, '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--remote-debugging-port=0', '--enable-unsafe-extension-debugging', 'about:blank'], `browser-${Date.now()}`);
  const active = join(profile, 'DevToolsActivePort');
  await until(() => existsSync(active), 'DevTools endpoint');
  const [port, endpoint] = readFileSync(active, 'utf8').trim().split(/\r?\n/);
  const socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  connection = new CDP(socket);
  management = await connection.page('chrome://extensions/');
  await until(() => connection.evaluate('typeof chrome.developerPrivate?.updateProfileConfiguration === "function"', management), 'extension management');
  await connection.evaluate('chrome.developerPrivate.updateProfileConfiguration({inDeveloperMode:true})', management);
  const loaded = await connection.call('Extensions.loadUnpacked', { path: extension });
  assert.equal(loaded.id, extensionId);
  appSession = await connection.page(`chrome-extension://${extensionId}/src/manager/index.html`);
  return connection.call('Browser.getVersion');
}
async function storage(keys) {
  await until(() => connection.evaluate('Boolean(chrome.storage?.local)', appSession), 'extension page navigation');
  return connection.evaluate(`chrome.storage.local.get(${JSON.stringify(keys)})`, appSession);
}
async function openConfiguration() {
  await until(() => connection.evaluate(`Array.from(document.querySelectorAll('[role="tab"]')).some(tab=>tab.textContent.trim()==='配置')`, appSession), 'manager tabs');
  await connection.evaluate(`Array.from(document.querySelectorAll('[role="tab"]')).find(tab=>tab.textContent.trim()==='配置').click()`, appSession);
  await until(() => connection.evaluate(`document.body.textContent.includes('外部连接：')`, appSession), 'native settings UI');
}
async function setEnabled(enabled) {
  await connection.evaluate(`new Promise((resolve,reject)=>chrome.management.setEnabled('${extensionId}',${enabled},()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve(true)))`, management);
}
function events() {
  const text = readFileSync(join(data, 'events.jsonl'), 'utf8');
  return text.slice(0, text.lastIndexOf('\n') + 1).split('\n').filter(Boolean).map(line => JSON.parse(line));
}

console.log(`Artifacts: ${run}`);
writeFileSync(join(native, 'artifacts/latest-acceptance.txt'), run);
try {
  command(['install', '--browser', browser, '--user-data-dir', profile, '--extension-id', extensionId]);
  registered = true;
  command(['timing', '--startup-ms', '6000', '--close-wait-ms', '500']);
  assert.equal(command(['start', '--no-notify']).state, 'paused');
  command(['enable'], 1);
  record('installation', { disabledByDefault: true, enabledBeforeHandshakeRejected: true });
  record('browser', await startBrowser());
  await until(async () => (await storage(['config'])).config, 'product background initialization');
  await openConfiguration();
  await connection.evaluate(`Array.from(document.querySelectorAll('label')).find(label=>label.textContent.includes('启用与本地监控程序的通信')).querySelector('input').click()`, appSession);
  await connection.evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='保存配置').click()`, appSession);
  await until(async () => (await storage(['config'])).config?.nativeMessagingEnabled === true, 'save native connection setting');
  await until(() => { const current = status(); return current.extensionConnected && current.verified; }, 'real product handshake');
  assert.equal(command(['doctor']).ok, true);
  command(['enable']);
  await until(() => status().state === 'monitoring', 'protection enable');
  record('handshake', { actualProductUI: true, verified: true, enabled: true });
  unrelated = launch([`--user-data-dir=${join(run, 'unrelated')}`, '--headless=new', '--no-first-run', '--disable-gpu', '--disable-extensions', 'about:blank'], 'unrelated');
  const before = await storage(['nativeMonitorStatus']);
  const appInfo = await connection.call('Target.getTargetInfo', {}, appSession);
  await connection.call('Target.closeTarget', { targetId: appInfo.targetInfo.targetId });
  const idleSeconds = Number(process.env.FOCUS_ACCEPTANCE_IDLE_SECONDS ?? 65);
  await delay(idleSeconds * 1000);
  appSession = await connection.page(`chrome-extension://${extensionId}/src/manager/index.html`);
  const stored = (await storage(['nativeMonitorStatus'])).nativeMonitorStatus;
  assert.equal(stored.state, 'connected'); assert.equal(stored.monitor.state, 'monitoring'); assert.equal(stored.monitor.enabled, true);
  assert(stored.updatedAt - before.nativeMonitorStatus.updatedAt >= Math.max(0, idleSeconds - 20) * 1000);
  assert.equal(unrelated.exitCode, null);
  assert.equal(status().targetPid, browserChild.pid);
  await openConfiguration();
  await until(() => connection.evaluate(`document.body.textContent.includes('保护状态：保护运行中')`, appSession), 'verified protection shown in the real manager');
  record('product-heartbeats', { idleSeconds, workerDebuggerAttached: false, storedStatus: stored, unrelatedPid: unrelated.pid, managerStatusVerified: true });

  await setEnabled(false);
  await until(() => status().state === 'gracePeriod', 'temporary disconnect');
  await delay(1000); await setEnabled(true);
  await until(() => status().state === 'monitoring', 'recovery within grace');
  await delay(5500); assert.equal(browserChild.exitCode, null);
  record('recovery', { cancelledClose: true });

  await connection.evaluate(`new Promise((resolve,reject)=>chrome.developerPrivate.reload('${extensionId}',{},()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve(true)))`, management);
  await until(() => status().extensionConnected, 'product reload');
  await delay(5500); assert.equal(browserChild.exitCode, null);
  record('reload', { alive: true });

  command(['disable']); await until(() => status().state === 'paused', 'local pause');
  appSession = await connection.page(`chrome-extension://${extensionId}/src/manager/index.html`);
  await storage(['config']);
  await connection.evaluate(`chrome.alarms.create('native-monitor-recovery',{when:Date.now()+4000})`, appSession);
  const toClose = await connection.call('Target.getTargetInfo', {}, appSession);
  await connection.call('Target.closeTarget', { targetId: toClose.targetInfo.targetId });
  await connection.call('ServiceWorker.enable', {}, management);
  const beforeWorkerStop = events().length;
  await connection.call('ServiceWorker.stopAllWorkers', {}, management);
  await until(() => events().slice(beforeWorkerStop).some(event => event.event === 'connected'), 'cold worker recovery through a scheduled alarm', 20000);
  record('cold-worker-recovery', { nativeSessionRestored: true, alarmScheduled: true, workerDebuggerAttached: false });
  await setEnabled(false); await delay(5500); assert.equal(browserChild.exitCode, null);
  await setEnabled(true); await until(() => status().extensionConnected, 'paused handshake');
  command(['enable']); await until(() => status().state === 'monitoring', 'reenable protection');
  record('local-pause', { browserSurvivedDisconnect: true });

  const beforeClose = events().length;
  await setEnabled(false);
  await until(() => browserChild.exitCode !== null, 'real browser close after disable');
  const closeEvent = events().slice(beforeClose).find(event => event.event === 'requestClose');
  assert.equal(closeEvent.target.pid, browserChild.pid); assert.equal(unrelated.exitCode, null);
  record('disable-real-close', { targetPid: browserChild.pid, unrelatedAlive: true });

  connection.close();
  browserChild = launch([`--user-data-dir=${profile}`, '--headless=new', '--no-first-run', '--disable-gpu', '--disable-extensions', 'about:blank'], 'without-extension');
  const restartedPid = browserChild.pid;
  await until(() => browserChild.exitCode !== null, 'startup without extension must close', 20000);
  assert.equal(unrelated.exitCode, null);
  record('restart-without-extension', { targetPid: restartedPid, closed: true });

  await startBrowser();
  // Some Chromium versions preserve the disabled state of a command-line loaded extension.
  await setEnabled(true);
  await until(() => status().state === 'monitoring', 'browser restart handshake');
  const beforeUninstall = events().length;
  await connection.call('Extensions.uninstall', { id: extensionId });
  await until(() => browserChild.exitCode !== null, 'real browser close after uninstall');
  assert(events().slice(beforeUninstall).some(event => event.event === 'requestClose' && event.target.pid === browserChild.pid));
  assert.equal(unrelated.exitCode, null);
  record('uninstall-real-close', { targetPid: browserChild.pid, unrelatedAlive: true });
  record('complete', { passed: true, actualCloseTested: true });
} catch (error) {
  record('failure', { message: error.message, stack: error.stack });
  process.exitCode = 1;
} finally {
  connection?.close();
  if (registered) {
    try { command(['uninstall']); record('native-cleanup', { unregistered: true, stopped: true }); }
    catch (error) { record('cleanup-failure', { message: error.message }); process.exitCode = 1; }
  }
  for (const child of children) {
    if (child.exitCode === null) {
      const result = spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { encoding: 'utf8' });
      if (result.status !== 0 && child.exitCode === null) child.kill();
    }
  }
}
