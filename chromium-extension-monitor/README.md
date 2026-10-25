# Bilibili Focus Mode — Windows 扩展监控程序

独立守护进程监测登记的 Chrome/Chromium 实例。专注扩展停用、卸载、失去心跳或浏览器启动后始终没有扩展连接时，程序先给予恢复时间，再请求关闭该实例；正常关闭未完成时，才通过已核对的进程句柄终止目标。

当前支持 Windows 10/11、Chrome/Chromium，以及单个登记的浏览器数据目录。推荐使用独立 user-data-dir。一个数据目录中的多个 profile 共用浏览器进程，关闭范围是整个实例，不能只关闭某个 profile。访客、无痕、多 profile 的拦截覆盖不在本版承诺范围内。

## 构建与发行文件

在仓库根目录执行：

```powershell
npm run build
cargo build --release --manifest-path chromium-extension-monitor/Cargo.toml
```

`chromium-extension-monitor/target/release/` 中有三个必须一起分发的文件：

| 文件 | 用途 |
| --- | --- |
| `monitor.exe` | 安装、诊断、配置与本地控制 CLI |
| `bilibili-focus-watchdog.exe` | 无控制台窗口的独立守护进程，供后台启动和登录启动 |
| `bilibili-focus-host.exe` | Chrome 启动的 Native Messaging 桥接主机 |

不需要管理员权限或 Windows 系统服务，不会在 Native Host 启动时提权。

## 首次使用

1. 用独立数据目录启动浏览器，并在该实例的 `chrome://extensions` 开启开发者模式，加载扩展 `dist/`：

   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" "--user-data-dir=$env:LOCALAPPDATA\BilibiliFocusBrowser"
   ```

2. 复制扩展 ID。从三个发行文件所在目录运行安装命令，填入真实路径与 ID：

   ```powershell
   .\monitor.exe install --browser "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir "$env:LOCALAPPDATA\BilibiliFocusBrowser" --extension-id "abcdefghijklmnopabcdefghijklmnop" --autostart
   .\monitor.exe start
   ```

   安装默认不启用保护。`--autostart` 登记当前用户登录启动；不加此参数不会新建登录启动项。

3. 在扩展管理页的配置中，启用“与本地监控程序的通信”，点击“保存配置”。确认外部连接显示已连接。

4. 完成诊断后，主动启用本地保护：

   ```powershell
   .\monitor.exe doctor
   .\monitor.exe enable
   .\monitor.exe status
   ```

   首次没有完成真实扩展握手时，`enable` 会拒绝启用。状态中的 `verified` 表示登记已通过握手，`extensionConnected` 表示当前连接在线，`enabled` 表示本地保护开关，`dryRun` 表示只模拟不关闭。

安装位置默认为 `%LOCALAPPDATA%\BilibiliFocusMonitor`。安装会复制发行文件至该目录的 `bin/`，并注册 Chrome/Chromium 对应的 HKCU NativeMessagingHosts 子键默认值。可继续使用发行目录的 CLI，或使用安装目录 `bin/monitor.exe`。

## 本地控制

```powershell
# 暂停保护，通信仍可保持在线
.\monitor.exe disable

# 恢复已经验证的登记目标
.\monitor.exe enable

# 禁用保护并停止后台进程
.\monitor.exe stop

# 重新启动后台进程
.\monitor.exe start

# 登录启动开关
.\monitor.exe autostart on
.\monitor.exe autostart off

# 当前状态、完整诊断
.\monitor.exe status
.\monitor.exe doctor

# 停止、禁用保护并移除本安装拥有的主机与登录启动登记
.\monitor.exe uninstall
```

**扩展通信开关与本地保护开关不同。** 保护已启用时，关闭通信并保存也会触发失联处置。暂停时先运行 `disable`。

`uninstall` 保留已禁用的配置、日志和二进制文件，便于诊断与重新安装；不会安排后台延迟自删除。确认进程退出后，可自行删除安装目录。更新发行文件前先执行 `stop`，必要时暂时关闭扩展通信，避免正在运行的 Host 占用旧二进制文件。

## 配置与时限

配置在安装目录的 `config.json`。CLI 支持以下可选覆盖，只有明确传入的字段会改变，所有字段在保存前统一验证：

```powershell
.\monitor.exe timing --startup-ms 30000 --heartbeat-timeout-ms 45000 --grace-ms 5000 --close-wait-ms 3000 --resume-ms 30000
```

心跳超时不能低于 30 秒，避免将正常的 15 秒心跳误判为失联。其他时限范围为 100–300000 毫秒。配置保存后会由守护进程重新读取。

| 项目 | 默认值 | 行为 |
| --- | --- | --- |
| 启动等待 | 30 秒 | 目标实例出现后等待有效握手 |
| 心跳间隔 | 15 秒 | 扩展发送带 session 和递增序号的心跳 |
| 心跳超时 | 45 秒 | 管道仍在但没有有效心跳时进入恢复期 |
| 恢复期 | 5 秒 | 连接明确断开或启动等待超时后，允许恢复 |
| 正常关闭等待 | 3 秒 | 恢复期结束后先发送 WM_CLOSE，仍未退出再终止 |
| 唤醒恢复窗口 | 30 秒 | 检测到系统休眠后恢复时重新等待连接 |

连接明确断开后，通常在约 5 秒后请求关闭；无心跳则先等待心跳超时。强制终止还需要等待正常关闭期限。因此不能把所有场景描述为“5 秒内强杀”。所有截止时间使用不包含睡眠的 Windows 活跃时间，墙上时间只用于日志。

如果浏览器没有显式 `--user-data-dir`，默认不纳入监控。需要监控默认实例时，安装可显式添加 `--allow-default-profile`；这表示用户确认没有该参数时就是所登记的数据目录。推荐优先使用显式独立目录，避免不确定的便携版/默认目录约定。

自定义安装目录可以使用全局 `--data-dir`：

```powershell
.\monitor.exe --data-dir "D:\FocusMonitor" install --browser "C:\path\chrome.exe" --user-data-dir "D:\FocusBrowser" --extension-id "abcdefghijklmnopabcdefghijklmnop"
.\monitor.exe --data-dir "D:\FocusMonitor" start
```

安装后的 Host 和 Watchdog 根据各自 `bin/` 的父目录定位配置，不依赖 Chrome 的工作目录。开发测试还支持 `BILIBILI_FOCUS_MONITOR_DIR` 环境变量。

## 模拟运行与诊断

```powershell
.\monitor.exe start --dry-run --no-notify
# 或在前台运行，stdout 为 CLI 输出，原生协议输出始终独立
.\monitor.exe run --dry-run --no-notify
```

模拟模式会记录 `wouldClose` 而不调用关闭 API，界面明确显示模拟模式。模式由守护进程启动参数决定；从模拟切换为真实模式需 `stop` 后重新 `start`。

诊断和日志文件：

- `status.json`：最近状态；`status` 命令通过活跃管道查询，离线时明确标记 `watchdogRunning: false`。
- `verified.json`：成功握手时的目标登记；改变目标后不沿用其他目标的验证。
- `events.jsonl`：状态、连接、关闭与失败事件。超过约 2 MiB 后轮换到一个 previous 文件。
- `startup.log` / `startup-error.txt`：后台启动失败的上下文。

`doctor` 检查配置、Host manifest、允许的 origin、32/64 位注册表视图、浏览器路径、Watchdog 和当前握手。若 Chrome 显示 Host 找不到，先检查是否移动了发行或扩展目录、是否改变扩展 ID，以及是否存在其他安装的同名主机登记。本程序拒绝覆盖另一个安装的登记。

若状态为 `faulted`，先处理给出的原因；无法确认唯一进程身份或无法关闭时，不会按进程名扩大终止范围。需要重新初始化监控时，执行 `stop` 后 `start`。

## 检查与真实浏览器验收

```powershell
cargo fmt --check --manifest-path chromium-extension-monitor/Cargo.toml
cargo clippy --offline --manifest-path chromium-extension-monitor/Cargo.toml --all-targets -- -D warnings
cargo test --offline --manifest-path chromium-extension-monitor/Cargo.toml
npm run typecheck
npm run lint
npm run test -- --run
npm run build

# 使用具备 Extensions.loadUnpacked 调试接口的 Chromium / Chrome for Testing。
python chromium-extension-monitor/tests/install.py "C:\path\to\chromium\chrome.exe"
node chromium-extension-monitor/tests/browser.mjs "C:\path\to\chromium\chrome.exe"
```

验收脚本直接复制正式 `dist/` 产物至临时目录，使用独立扩展 ID、两个浏览器数据目录及临时本地安装。它会真实关闭测试创建的浏览器，覆盖握手、UI 保存配置、恢复、重载、强制停止 worker 后的恢复、暂停、停用/卸载关闭和无连接重启；不会按进程名称清理日常浏览器。如果标准主机名已登记给其他目录，安装会拒绝，测试不会覆盖它。

默认观察 65 秒；`FOCUS_ACCEPTANCE_IDLE_SECONDS=310` 可观察超过 5 分钟。默认使用 debug 二进制；测试 release 时设置 `FOCUS_BUILD_PROFILE=release`。输出在忽略的 `artifacts/`，不提交浏览器用户数据。

纯状态机测试覆盖时间与会话竞争；Windows 测试使用自建子进程核对真实终止与 PID 复用拒绝。物理休眠/唤醒、实际 Windows 登录以及每种正式 Chrome 发行版仍需要在目标机器上验收。
