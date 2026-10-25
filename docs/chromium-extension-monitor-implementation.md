# Windows 原生监控：实现与验收记录

本版实现 `Windows + Chrome/Chromium + 一个登记的浏览器数据目录` 的完整监控链路。使用说明见 [监控程序 README](../chromium-extension-monitor/README.md)。[P0 报告](./chromium-extension-monitor-feasibility.md)保留原型阶段的证据；本文件记录正式实现。

## 已交付功能

- 独立运行的 Watchdog，以及由 Chrome 管理生命周期的 Native Host。Host 退出不会带走倒计时。
- 类型化配置、64 KiB 帧限制、UTF-8 字节协议、`hello/ready` 与带 session/序号的心跳。
- 纯状态机：启动等待、监控、恢复期、正常关闭等待、强制终止、暂停、故障与模拟模式。
- 按完整可执行文件路径、显式 user-data-dir、PID、创建时间识别实例；终止前复核并固定进程句柄。
- 当前用户 ACL 的 Named Pipe、独立单实例锁、原子配置/状态替换及有大小上限的事件日志。
- 安装/卸载、后台启停、本地保护开关、时限配置、状态查询、诊断和 HKCU 登录启动管理。
- 首次安装默认不启用保护，首次启用前必须有匹配目标的真实握手记录。
- 扩展 worker 冷启动、安装/更新、浏览器启动、配置变更及一分钟恢复 alarm；旧读取与旧 Port 事件隔离。
- 管理页明确区分通信与实际保护，模拟/未验证/断连不会显示为实际保护生效。
- Windows CI 执行 fmt、clippy、Rust 测试和 release 构建，上传三个发行文件。

`stop` 会同时禁用保护；`uninstall` 停止程序并移除本安装拥有的主机/登录启动登记，保留已禁用配置、日志和二进制文件，不执行延迟自删除。

## 功能提交

| 提交 | 内容 |
| --- | --- |
| `c6f5128` | 保存通过 P0 验证的原型与连接修正 |
| `083ece4` | 类型化配置、帧协议与纯状态机 |
| `8614111` | Windows Host/Watchdog、句柄核对与定向关闭 |
| `b11848b` | 安装、登记、后台启动、启停、诊断、登录启动和回滚 |
| `8a85710` | 扩展共享协议、worker 恢复服务与管理页状态 |
| `63a67e8` | 修复同步 Windows 管道的心跳阻塞 |
| `e8534ba` | 时限约束、故障保留、配置恢复和诊断准确性 |
| `5bfdb0f` | 修复无关 Chrome 子进程不可查询导致的误判 |
| `bb3e8b2` | Windows 原生程序 CI |

前端设计系统提交 `272a65a` 是工作区中的并行工作，不属于本次监控实现提交。

## 自动检查

- Rust：26 项测试通过，包括状态机、错误配置、协议、路径匹配、注册表 Unicode 回读、真实测试子进程终止和 PID 复用拒绝；fmt 与 clippy `-D warnings` 通过。
- 扩展：22 个测试文件、233 项测试通过；typecheck、lint 和生产构建通过。
- 原生 release：三个二进制均构建成功。测试安装中的副本与 `target/release/` 的 SHA-256 一致。
- 安装脚本验证：Unicode 路径、默认禁用、后台启动、未握手拒绝启用、登录启动登记与清理、doctor、卸载、发行文件缺失时回滚和注册表视图冲突保留。
- 配置恢复验证：无效配置使 Watchdog 进入 faulted，doctor 返回失败；恢复有效配置后重新进入暂停状态。
- CI 已写入仓库；本次未推送或在 GitHub 上运行工作流。

## 真实 Chromium 验收

环境为 Windows、Chromium `156.0.8078.4`、Node.js `24.11.1`、Rust `1.98.1`。脚本直接复制正式 `dist/` 产物，使用临时扩展 ID 和 CDP 安装未打包扩展。没有附加 service worker 调试器；长时间观察期间关闭了扩展管理应用页面，只保留浏览器内部管理页。

完整 debug 验收目录为 `acceptance-1792905048435-中文 space`，已记录 `complete.passed = true` 和登记清理成功。

| 场景 | 结果 |
| --- | --- |
| 在真实配置页面开启通信并点击保存 | 完成真实 Host/Watchdog 握手，doctor 通过 |
| 启用保护后心跳回传 | 本地和扩展持久状态均为 monitoring，真实管理页显示保护运行中 |
| 另一个数据目录的 Chromium 同时运行 | 未纳入目标，所有实际关闭场景中保持运行 |
| 恢复期内重新启用扩展 | 取消关闭，超过原截止时间仍存活 |
| 重载扩展 | 会话恢复，浏览器保持运行 |
| 强制停止 service worker，预先安排恢复 alarm | 没有 worker 调试器，出现新的 Native 会话并恢复连接 |
| 本地暂停后停用扩展 | 浏览器保持运行；恢复通信后可重新启用保护 |
| 保持保护，完整停用扩展 | 请求关闭并实际退出登记的浏览器 |
| 同一目录在没有扩展连接时重启 | 独立发现新实例，启动等待与恢复期结束后实际关闭 |
| 重新启动并卸载扩展 | 再次实际关闭登记实例，无关实例保持运行 |
| 结束验收 | 停止 Watchdog、禁用本地保护、移除本次登记并回收测试进程 |

本次浏览器验收将启动等待缩短为 6 秒、正常关闭等待缩短为 500 毫秒；恢复期仍是 5 秒，心跳超时仍是 45 秒。正式默认配置是 30 秒启动等待、5 秒恢复、3 秒正常关闭等待。

release 长时间验收目录为 `acceptance-1792905278921-中文 space`，**310 秒观察、20 次有效心跳、完整后续生命周期场景全部通过**，没有 faulted 状态。原始记录已确认 `complete.passed = true`，随后 `native-cleanup` 确认停止并移除本次登记。32/64 位主机注册表视图均已核对清理，测试路径下的浏览器与监控进程已确认退出。

发行包生成于 `chromium-extension-monitor/artifacts/bilibili-focus-monitor-windows-x64.zip`，包含三个 release 可执行文件、使用说明与各文件 SHA-256 清单。压缩包 SHA-256：`dcd5556bd9b1a3f3140c4fe2807474f95a235531b7fc4978564afcd48392cee1`。

## 验收中修复的问题

1. 同步管道被克隆后，一个线程持续读取会阻塞另一个线程后续写入，导致首次握手后心跳无法发送。正式 Host 改为单线程串行完成管道请求/响应，stdin 保持独立读取，并限制待处理请求数量。
2. 不能把同名 Chrome 子进程临时不可查询当作精确登记根进程不可用。发现逻辑先收集精确匹配，再决定是否不可确定；查询故障恢复后重新打开有界的启动等待。
3. Windows 后台启动必须避免继承调用终端的管道。启动时暂时清除父进程标准句柄的继承标志，避免 `start` 已返回但调用者一直等待输出 EOF。
4. 心跳超时不能小于正常心跳周期；配置校验要求至少 30 秒。唤醒不能重新启用一个由于身份不确定而故障的实例，doctor 也不能把 faulted 状态当作健康。
5. 测试环境的 Node 24 `cpSync` 与 `rmSync` 会损坏部分 Unicode 路径。验收脚本改用已验证的逐文件复制和 unlink API，并明确检查旧调试端点已删除。

## 验证边界

已测试真实关闭与重新启动，但不对全部浏览器发行版作兼容承诺。状态机测试覆盖休眠恢复决策，本地安装验收覆盖登录启动登记；本次没有让用户电脑实际注销或物理休眠。桌面倒计时窗口已经实现，自动浏览器测试使用 `--no-notify`，未进行系统窗口的视觉验收。

同一个 user-data-dir 下的多个 profile 不能按 OS 进程分开关闭。本版不承诺访客/无痕/多 profile 的页面拦截覆盖，也不提供反卸载、反任务管理器或管理员级防绕过。

## 重现

```powershell
npm run build
cargo build --manifest-path chromium-extension-monitor/Cargo.toml
python chromium-extension-monitor/tests/install.py "C:\path\to\chromium\chrome.exe"
node chromium-extension-monitor/tests/browser.mjs "C:\path\to\chromium\chrome.exe"

# 对 release 做超过五分钟观察
$env:FOCUS_BUILD_PROFILE = 'release'
$env:FOCUS_ACCEPTANCE_IDLE_SECONDS = '310'
node chromium-extension-monitor/tests/browser.mjs "C:\path\to\chromium\chrome.exe"
```

所有原始结果在忽略的 `chromium-extension-monitor/artifacts/`。不提交浏览器用户数据，也没有向远端推送提交或发布软件。
