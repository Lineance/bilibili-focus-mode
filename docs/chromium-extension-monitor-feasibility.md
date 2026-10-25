# Chromium Extension Monitor：P0 可行性验证

此报告保留原型阶段的验证结论。正式实现与实际关闭验收已另行记录于 [实现与验收报告](./chromium-extension-monitor-implementation.md)。

## 结论

Windows 上的“扩展后台 → Native Host → Named Pipe → 独立 Watchdog”链路已在真实 Chromium 中运行。已验证主机注册、握手、消息完整性、实例关联、停用及卸载后的独立倒计时、重新启用、重新安装、重载恢复、正常退出，以及浏览器启动时没有扩展连接的独立发现。

核心架构可继续实施。原型只输出 `would_close`；真实关闭、常驻安装、休眠唤醒与生产浏览器兼容性仍属于后续验收范围。

主验证运行完成了 310 秒保活观察与完整场景测试；原始记录目录为 `run-1792900385621-中文 space`。补充卸载与重新安装运行是 `run-1792900778989-中文 space`。两轮均记录 `complete.passed = true`，清理记录均确认临时注册已移除；测试根进程及 Watchdog 也已检查退出。

## 环境与方法

- Windows，Rust `1.98.1`，Node.js `24.11.1`。
- 测试浏览器：Playwright 缓存的 Chromium `156.0.8078.4`，revision `f842f52ef39fd97b449eb27cff414bf05a98ddce`。
- `--headless=new`，独立的 user-data-dir，目录包含中文与空格。
- 使用临时生成的独立扩展 ID、`com.bilibili.focus.probe` 主机名、随机 Named Pipe。
- 测试扩展直接转译仓库实际的 `NativeMessagingClient.ts`；另加最小安装/启动/配置监听。它没有加载整个产品后台，故不代表所有业务初始化路径已经做过端到端验证。
- CDP 仅连接测试控制页及扩展管理页，未附加到 service worker。
- Native Host 和 Watchdog 使用同一个 Rust 原型可执行文件的不同入口；Watchdog 由测试驱动独立启动。
- 无需安装 npm/Python 包，也未修改日常 Chrome 的 profile。测试结束清理本次主机注册和测试进程。

## 已观察到的事实

### 1. Chrome 启动参数与进程链

实际参数为：

```text
chrome-extension://<测试扩展 ID>/
--parent-window=0
```

实际祖先链为：

```text
Node 测试驱动
└── Chrome 根进程
    └── cmd.exe
        └── Native Host

Node 测试驱动
└── 独立 Watchdog
```

因此不能依赖非零窗口句柄定位浏览器，也不能仅检查 Native Host 的直接父进程。原型通过 Named Pipe 提供的客户端 PID 向上追溯，核对完整浏览器可执行文件路径及显式 user-data-dir，再按 PID 和创建时间识别实例。

### 2. 握手与二进制消息

Host 能通过正确的 HKCU 子键默认值被浏览器启动。扩展收到 Watchdog 确认后的 `ready` 才进入 connected。

真实消息包含中文、空格和换行；Host 回复刻意构造为 **266 字节**，其长度头部含 `0A`，仍能成功解析。说明当前 Rust stdin/stdout 字节 I/O 路径未出现 Windows 文本模式换行转换。

仅创建 Port、无 ready、错误 ready、旧会话 pong、重复 pong、无 pong 等情况另有单元测试覆盖。

### 3. 停用与恢复

在完整主运行中，停用扩展后，Named Pipe 断开，Watchdog 继续存活；从 `grace_started` 到 `would_close` 为 **5.001 秒**。重新启用后重新建立会话。

另一次临时停用在恢复期内重新启用，Watchdog 取消倒计时；继续等待超过原截止时间，没有 `would_close`。

### 4. 重载的前置条件

首次命令行加载可成功，但测试 profile 未开启开发者模式时，重载后的 `disableReasons.unsupportedDeveloperExtension` 为 true，扩展状态变为 DISABLED。

开启隔离 profile 的开发者模式后，重载恢复成功，5 秒恢复期结束后没有错误的 `would_close`。这是测试环境的真实前置条件，不能通过给重连增加无限宽限来掩盖。

### 5. 正常退出与无连接启动

通过 CDP 正常关闭测试浏览器，Watchdog 检测到实例退出并取消旧倒计时；继续等待超过 5 秒，没有旧实例的 `would_close`。

重新启动相同 user-data-dir、使用 `--disable-extensions` 保证没有 Host 连接时，Watchdog 仍能独立发现新实例，在约 **15.199 秒**后记录 `would_close`，符合本次的 10 秒启动等待 + 5 秒恢复时间。

这个场景证明“没有扩展连接也能触发监控”。它没有完整验证每一种浏览器对手动停用状态的跨重启持久化行为。

### 6. 长时间保活与实例隔离

主运行连续观察 **310 秒**，收到 **20 次**心跳，期间未向 service worker 附加调试器，没有失联告警或 `would_close`。

同时启动同一个 Chromium 可执行文件、另一个 user-data-dir 的浏览器。Watchdog 仅登记预期根进程；停用目标扩展后的 `would_close` 也只指向目标 PID，另一个实例仍在运行。此验证确认目标选择，不代表已经验证真实关闭时的系统行为。

### 7. 卸载与重新安装

通过浏览器 CDP `Extensions.uninstall` 卸载测试扩展后，独立 Watchdog 在 **5.113 秒**后记录正确目标的 `would_close`，自身仍在运行。

随后使用 `Extensions.loadUnpacked` 重新安装同一个测试扩展，扩展 ID 保持一致，握手和监控恢复。补充运行也再次通过了恢复期内恢复、停用、重载、正常退出和无扩展连接启动等场景。

## 本次扩展侧改动

`src/background/NativeMessagingClient.ts`：

- 创建 Port 后立即 hello，只有协议版本正确且 Watchdog 就绪的 ready 才确认连接。
- 5 秒握手超时、15 秒心跳、45 秒 pong 超时；按 session 和递增序号接受应答。
- 异步失败累积退避，仅有效 ready 后重置；去掉尝试 10 次后永久放弃的逻辑。
- 连接代次隔离，旧 Port 回调不覆盖新 Port；主动 disconnect 停止重试并清理计时器。
- 允许构造时指定测试主机名，正式默认名称保留。

`src/background/index.ts`：配置变更时立即连接或断开 Native Messaging。

尚需正式实现的扩展工作：worker 断连后通过 alarm 兜底恢复、最低 Chrome 版本约束、共享协议模块、管理页的连接/保护状态和本地暂停提示。当前短期重连计时器不能代替 worker 结束后的恢复机制。

## 自动检查

- Rust：8 项协议与目标匹配测试通过，`cargo clippy --all-targets -- -D warnings` 通过。
- 扩展连接类：9 项测试通过；后台测试合计 24 项通过。
- 当前工作区全量测试：20 个文件、219 项通过。
- `npm run lint`、`npm run typecheck`、`npm run build` 通过。
- 构建仍有 CRX 插件配置和 Browserslist 数据提示，不影响本次构建成功。

工作区有并行的界面与测试修改，全量测试结果表示运行时的工作区状态；这些界面修改不属于本次 Native Messaging 原型交付。

## 后续实施条件

可以进入可测试的正式状态机与 Windows 控制层，但接入真实关闭前仍需完成：

1. 正常关闭请求与定向强制终止，在测试创建的浏览器实例上验证，包含 PID 复用与关闭失败。
2. 普通有界面 Chrome/Chromium 的安装方式、直接 exe 启动路径及实际支持的 Windows 版本。
3. 当前用户 Named Pipe ACL、稳定配置位置、单实例运行、登录启动和安装卸载对称性。
4. worker 意外终止后的 alarm 恢复、系统休眠唤醒及连续多次重连竞争。
5. 明确多 profile、访客、无痕范围；同一个 user-data-dir 不能宣称按 profile 隔离关闭。
6. 原型轮询与进程查询的性能测量；不沿用旧 README 的资源占用承诺。

## 重现与证据

运行方法与检查命令见 [原型 README](../tools/native-monitor-probe/README.md)。原型源代码在 `tools/native-monitor-probe/`。

每次运行的原始证据保存在忽略的 `tools/native-monitor-probe/artifacts/run-*/`，包括 `results.json`、`events.jsonl`、`reload-diagnostics.json`、`cleanup.json`。`artifacts/latest-run.txt` 指向最新目录。报告只记录经过核实的结论，不提交浏览器用户数据。
