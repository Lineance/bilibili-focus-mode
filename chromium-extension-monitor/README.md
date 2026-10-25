# Bilibili 专注守护（Windows）

独立的 Rust 监控程序。在登记的浏览器中，专注扩展持续缺失、停用、卸载或失去心跳时，先发出 Windows 提醒并给予恢复时间，再请求关闭该实例；正常关闭没有完成才定向终止。

当前支持 Windows 10/11、Chrome/Chromium 和单个登记的数据目录。同一数据目录中的多个 profile 会一起关闭，建议使用独立目录。本版不承诺访客、无痕和多 profile 的页面拦截覆盖。

## 推荐：从图形入口开始

1. 下载并解压 Windows ZIP，保留同一目录中的三个程序。另行加载本仓库的扩展发行包，取得 32 位扩展 ID。
2. 双击 **`bilibili-focus-watchdog.exe`**。发行目录中的程序会打开配置引导；已安装的开始菜单入口会打开运行状态。
3. 选择 Chrome/Chromium 程序与类型，填写独立数据目录、扩展 ID，决定是否登录启动。可以先通过“打开浏览器扩展页”加载扩展。
4. 点击“保存并启动”。这一步只安装并启动监控，**保护保持暂停**。
5. 在扩展配置中开启“与本地监控程序的通信”，点击保存。
6. 在本地状态窗口测试通知并运行诊断，确认连接后点击“恢复保护”。

开始菜单入口名为“Bilibili 专注守护”。日常操作使用托盘：双击打开状态，右键查看状态、暂停/恢复、诊断、测试通知、日志、重新配置和停止退出。关闭状态窗口会隐藏到托盘，不会暂停保护。

### 通知与倒计时

- 正常浏览器启动允许短暂等待，超过去抖时间仍未连接才提醒。
- 同一次失联只提醒一次；后续倒计时更新不会反复轰炸。
- 恢复连接或暂停保护时撤销旧提醒与倒计时。
- 关闭倒计时窗不取消保护，也不会在下一帧重新弹出；新的失联事件可以再次提示。
- 倒计时不抢键盘焦点，窗口按系统 DPI 缩放。
- 通知中心的“查看状态”“暂停保护”使用当前安装专属的协议入口。
- Windows 接受通知不代表屏幕一定显示。系统关闭通知或启用免打扰时，查看通知中心、状态窗口和倒计时提示。

**扩展通信开关与本地保护开关不同。** 保护已启用时，关闭通信并保存也会触发失联处置。先从托盘暂停保护，再关闭通信。

## 配置、修复、升级和卸载

- 托盘或状态窗口的“重新配置”打开引导；保存前不会停止当前监控。
- 配置无法读取时显示修复提示，保存会留下 `config-backup-*.json` 再重建。
- 更新时退出旧监控、解压新发行包，再双击新目录中的 `bilibili-focus-watchdog.exe` 保存配置。引导会停止旧实例、等待它退出、替换文件并启动安装后的版本。
- 安装保留已有时限与适用的验证记录，仍将保护暂停；恢复保护由用户明确操作。
- 本地诊断给出可操作的原因，并可打开 `diagnostics.json` 和日志目录查看细节。
- 卸载移除本安装拥有的 Native Messaging、自启、系统通知身份、协议入口和开始菜单快捷方式；保留已禁用配置、日志和二进制，不安排延迟自删除。确认进程退出后可自行删除目录。

## 构建与发行文件

```powershell
npm run build
cargo build --release --manifest-path chromium-extension-monitor/Cargo.toml
```

`target/release/` 中的三个文件必须一起分发：

| 文件 | 用途 |
| --- | --- |
| `monitor.exe` | 安装、配置、诊断和管理 CLI |
| `bilibili-focus-watchdog.exe` | 原生状态/配置窗口、托盘和独立守护进程 |
| `bilibili-focus-host.exe` | Chrome 管理生命周期的 Native Messaging 主机 |

安装默认位于 `%LOCALAPPDATA%\BilibiliFocusMonitor`，发行程序会复制至其 `bin/`。使用 HKCU，不要求管理员权限，也不会在 Host 启动时提权。

## 命令行控制

```powershell
.\monitor.exe setup        # 打开配置引导
.\monitor.exe ui           # 打开状态窗口，无配置时进入引导
.\monitor.exe start        # 后台运行，显示托盘
.\monitor.exe disable      # 暂停保护，保持通信
.\monitor.exe enable       # 启用已完成握手验证的目标
.\monitor.exe status
.\monitor.exe doctor
.\monitor.exe notify-test  # 提交通知并人工确认显示
.\monitor.exe notify-status
.\monitor.exe notify-setup # 修复本安装的通知身份及快捷方式
.\monitor.exe autostart on
.\monitor.exe autostart off
.\monitor.exe stop         # 禁用保护并等待后台进程真正退出
.\monitor.exe uninstall
```

也可完全使用 CLI 安装：

```powershell
.\monitor.exe install --browser "C:\path\chrome.exe" --user-data-dir "D:\FocusBrowser" --extension-id "abcdefghijklmnopabcdefghijklmnop" --autostart
.\monitor.exe start
# 在扩展中开启通信并保存后
.\monitor.exe doctor
.\monitor.exe enable
```

首次未完成握手会拒绝 `enable`。移动扩展目录可能改变开发版 ID，需要重新登记。

自定义安装目录使用全局 `--data-dir`：

```powershell
.\monitor.exe --data-dir "D:\FocusMonitor" setup
```

Host/Watchdog 根据安装后的 `bin/` 父目录定位配置，开发测试支持 `BILIBILI_FOCUS_MONITOR_DIR`。如果浏览器没有显式 `--user-data-dir`，默认不纳入监控。高级用户可在 CLI 安装时显式选择 `--allow-default-profile`，确认该默认实例就是登记目标；GUI 改变范围时不沿用旧默认实例回退。

## 时限与模拟模式

| 项目 | 默认值 |
| --- | --- |
| 浏览器启动等待 | 30 秒 |
| 扩展心跳间隔 | 15 秒 |
| 心跳超时 | 45 秒 |
| 失联恢复时间 | 5 秒 |
| 正常关闭等待 | 3 秒 |
| 唤醒恢复窗口 | 30 秒 |

明确断连后约 5 秒请求关闭；无心跳则先等心跳超时；强制终止还需等正常关闭期限。不能把所有场景描述为“5 秒内强杀”。截止时间使用 Windows 活跃时间，墙上时间仅用于日志。

```powershell
.\monitor.exe timing --startup-ms 30000 --grace-ms 5000 --heartbeat-timeout-ms 45000 --close-wait-ms 3000 --resume-ms 30000
.\monitor.exe start --dry-run
.\monitor.exe run --dry-run --no-notify
```

心跳超时至少 30 秒，其他时限为 100–300000 毫秒。`--dry-run` 只记录 `wouldClose`，不实际关闭；`--no-notify` 禁用桌面/托盘，供自动测试使用。切换启动模式需先 stop。

## 日志与状态

- `config.json`：目标与时限。
- `verified.json`：与目标绑定的握手验证。
- `status.json`：最近状态；CLI 优先通过活跃管道查询，离线明确标记。
- `desktop-status.json` / `tray-status.json`：桌面和通知接口结果，不声称已人工确认可见。
- `events.jsonl`：状态、连接、关闭及失败，约 2 MiB 后轮换一个 previous 文件。
- `startup.log` / `startup-error.txt`：后台启动问题。
- `diagnostics.json`：手动运行诊断生成的本地详细报告。

无法唯一识别实例或没有权限时不会按进程名称扩大终止范围。检查是否提升运行了浏览器、ID 是否正确、是否保存通信设置，以及是否存在其他安装。故障解决后可停止再启动；损坏配置可用引导修复。

## 验证与 CI/CD

```powershell
cargo fmt --check --manifest-path chromium-extension-monitor/Cargo.toml
cargo clippy --locked --manifest-path chromium-extension-monitor/Cargo.toml --all-targets -- -D warnings
cargo test --locked --manifest-path chromium-extension-monitor/Cargo.toml
python chromium-extension-monitor/tests/install.py "C:\path\chrome.exe"
node chromium-extension-monitor/tests/browser.mjs "C:\path\chrome.exe"
# 以下需要真实 Windows 交互桌面；会发送测试通知、打开并控制自己的测试窗口。
python chromium-extension-monitor/tests/desktop.py "C:\path\chrome.exe"
python chromium-extension-monitor/tests/setup.py "C:\path\chrome.exe"
```

测试默认使用 debug，可设 `FOCUS_BUILD_PROFILE=release`。浏览器脚本需要支持 `Extensions.loadUnpacked` 的 Chromium/Chrome for Testing，默认观察 65 秒，`FOCUS_ACCEPTANCE_IDLE_SECONDS=310` 做长时观察。测试独立目录、临时 ID 和登记，只回收测试拥有的进程；已存在其他安装时拒绝覆盖。

GitHub CI 使用固定版本 Chrome for Testing；发布复用相同检查，包内包含三个程序、README、构建信息和 SHA-256 清单。扩展标签为 `vX.Y.Z`，原生标签为 `monitor-vX.Y.Z`；手动构建不发布。仓库的 `docs/github-action.md` 记录了完整 CI/CD 触发、产物与标签规则。

真实通知显示、免打扰、高 DPI 多屏、实际登录及物理休眠需要交互桌面验收，CI 不将其声称为已验证。Linux/macOS 和 Cargo 发布保持后续优先级。
