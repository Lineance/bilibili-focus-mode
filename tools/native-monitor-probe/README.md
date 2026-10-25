# Native Messaging 可行性验证原型

这是 Windows 专用的 P0 原型。它验证真实 Chromium → Native Host → 独立 Watchdog 的链路，只记录 `would_close`，**原生程序不包含终止浏览器的 API**。

## 运行

需要 Windows、Rust、Node.js、Python（标准库 `winreg`）和支持命令行加载扩展的 Chromium。Chrome 的部分正式发行版会限制 `--load-extension`；建议使用 Chromium / Chrome for Testing。

在仓库根目录执行：

```powershell
cargo build --offline --manifest-path tools/native-monitor-probe/Cargo.toml
node tools/native-monitor-probe/run.mjs "C:\path\to\chromium\chrome.exe"
```

不传浏览器路径时，脚本使用本机 Playwright 缓存中的 `chromium-1248/chrome-win64/chrome.exe`。不需要安装 Playwright 或 npm 新依赖。

正常运行约两分钟，其中包含 65 秒后台保活观察。可设置 `FOCUS_PROBE_IDLE_SECONDS=310` 做超过 5 分钟的观察；设为 `1` 只适合调试自动化，不构成保活验证。如果 `python` 是启动不稳定的 shim，可通过 `FOCUS_PROBE_PYTHON` 指定 Python 可执行文件的完整路径。

## 隔离与输出

- 每次生成独立的 user-data-dir、带中文及空格的目录、扩展 ID、随机 Named Pipe 名称。
- 临时注册的主机是 `com.bilibili.focus.probe`，与正式主机名称不同；如果该测试注册已存在则拒绝覆盖。
- 注册在 HKCU 的 64 位视图，回读检查默认值，结束时仅删除本次拥有的登记。
- 测试只关闭由脚本创建的浏览器进程树，用于回收测试资源；不会按 `chrome.exe` 名称清理进程。
- Watchdog 由 Node 脚本独立启动，不是 Native Host 的子进程。
- 不向 service worker 附加 CDP 调试器；控制页面和 `chrome://extensions` 页面用于读状态与操作测试扩展。
- `artifacts/latest-run.txt` 指向最近一次输出目录。`results.json` 为场景结果，`events.jsonl` 为 Watchdog 事件，`cleanup.json` 为清理结果。
- 生成物和 Rust target 均忽略，不应提交浏览器用户数据。

## 原型内容

- Rust `host`：接收 Chrome origin 和 `--parent-window` 参数，执行二进制帧读取，通过 Named Pipe 转发，收到 Watchdog 回复后输出消息帧。
- Rust `watch`：独立枚举进程，按完整 exe 路径与显式 user-data-dir 发现根进程；使用 PID 与创建时间区分实例；从 Named Pipe 客户端 PID 回溯 Host 祖先链以验证关联。
- 失联检测：Named Pipe 关闭后记录 5 秒倒计时；实例进程退出则取消；无 Native Host 的新浏览器实例经过 10 秒启动等待和 5 秒恢复时间后记录 `would_close`。
- 测试扩展：直接转译仓库实际的 `NativeMessagingClient.ts`，使用 `hello/ready`、15 秒心跳及序号应答；临时 fixture 补充安装、启动和配置事件。
- 消息验证：中文、换行、Unicode 路径，以及长度为 266 字节的真实 Host 回复，其头部包含 `0A`，用于发现 Windows 文本模式损坏。

## 验证边界

原型不等于生产守护程序。它使用默认 Named Pipe ACL 与随机名称，配置路径通过测试浏览器环境变量传递；生产安装需要显式用户 ACL、固定配置路径、单实例管理与登录启动。进程命令行读取使用 Windows `NtQueryInformationProcess(ProcessCommandLineInformation)`，需要在最终支持的 Windows 与浏览器版本上继续验证。

它不验证真实关闭、桌面倒计时通知、普通多 profile 使用、访客/无痕、系统休眠唤醒或性能指标。启动时禁止扩展的测试证明的是“没有 Native Host 也能发现登记实例”；不能用它代替所有浏览器版本中“停用状态持久化”的测试。

## 检查命令

```powershell
cargo test --offline --manifest-path tools/native-monitor-probe/Cargo.toml
cargo fmt --check --manifest-path tools/native-monitor-probe/Cargo.toml
cargo clippy --offline --manifest-path tools/native-monitor-probe/Cargo.toml --all-targets -- -D warnings
npm run test -- --run src/test/unit/background
npm run typecheck
npm run lint
npm run build
```
