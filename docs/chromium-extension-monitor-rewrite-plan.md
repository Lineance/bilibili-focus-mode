# Chromium Extension Monitor 重写方案

状态：已完成 P0 核心链路验证及扩展连接原型；正式守护程序尚未实现。实测范围与结果见 [P0 可行性报告](./chromium-extension-monitor-feasibility.md)。

## 1. 分析基线与目标

分析的是最新提交 `999be86c10957259d45b2358d9df2f02b3bf330c`（`refactor: delete extension monitor`）删除的 `chromium-extension-monitor/`。旧实现从其父提交 `229a4dd` 读取；扩展端以当前工作区为准。

功能目标：用户主动启用监控后，指定浏览器运行期间应保持 Bilibili Focus Mode 扩展在线。扩展停用、卸载或持续失去连接时，给予恢复时间；超时仍未恢复则关闭对应浏览器实例。正常退出浏览器应结束本次监控；扩展持续禁用后重启浏览器仍要受到监控。

这是个人自律工具。用户可从本地监控程序停止保护，无须引入管理员服务、反卸载或反任务管理器机制。Native Messaging 心跳证明扩展后台与通信链路在线，不代表每个 Bilibili 页面上的拦截逻辑都正确工作。

首版建议以 **Windows 10/11、Chrome/Chromium、单个登记的浏览器实例** 为范围；Rust 继续作为原生实现语言。Edge、macOS、Linux 分别扩展和验收，不继续沿用旧 README 中未经验证的跨平台承诺。

## 2. 官方资料与实现事实

### 2.1 Native Messaging 的能力与边界

依据 [Chrome Native Messaging 文档][1]：

- 扩展声明 `nativeMessaging` 权限，由扩展页面或后台调用；content script 需要通过后台转发。
- `runtime.connectNative()` 由 Chrome 启动一个原生主机并创建持久 Port。连接已有常驻进程需要主机另行通过本地 IPC 转接。
- `runtime.sendNativeMessage()` 每次启动新的主机，只将其第一条消息视为响应，不适合持续监控。
- 主机生命周期随 Port 结束。Chrome 不提供“扩展禁用后，主机继续执行 5 秒”的保证。
- 第一项启动参数是调用者 origin；Windows 另有 `--parent-window=<handle>`。service worker 调用时该句柄是 `0`，不能用它确定浏览器 PID 或目标窗口。
- Host manifest 的 `allowed_origins` 必须列出精确的扩展 origin，不支持通配符。开发版扩展 ID 发生变化时需要重新登记。
- Windows 应在 `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.bilibili.focus.monitor` 的**默认值**保存 manifest 绝对路径；Chrome 先查 32 位视图再查 64 位视图。
- 原生主机工作目录是其可执行文件所在目录，但应用配置和日志仍应使用明确的用户数据路径，避免依赖启动位置。

依据 [Chromium `NativeMessageProcessHost` 实现][4]，析构函数在主机进程有效时调用 `base::EnsureProcessTerminated()`。所读源码文件的 blob SHA 为 `14562bbd56465139db43f797894a6e88f82055ab`，相关逻辑在约 87–101 行。因此处置逻辑必须由生命周期独立的守护进程承担。

依据 [Chromium Windows 启动代码][5]，原生 `.exe` 可以直接启动，非 `.exe` 主机还存在经 `cmd.exe` 启动的路径。不能把“主机直接父进程一定是 Chrome”作为通用事实；进程关联必须验证。所读文件 blob SHA 为 `bde1be53e4cc246c55c7a036ad6c84edb520fe0a`。

### 2.2 消息协议

依据 [Native Messaging 文档][1]和[官方主机示例][6]：

- 帧为 4 字节无符号长度前缀，使用平台本机字节序，随后是 UTF-8 JSON。
- 长度按序列化后的字节数计算，不能使用字符串字符数。
- Chrome 接收原生主机消息的上限为 1 MiB，向主机发送消息的上限为 64 MiB。
- 本项目都是小型控制消息，可自行限制双向消息为 64 KiB；这是应用层限制，需要明确错误提示。
- stdout 只能包含消息帧；日志写 stderr 或独立文件。
- Windows 必须保证字节流不会被文本模式换行转换。使用 Rust 字节 I/O，并通过包含 `0A` 字节的真实帧测试验证；不能机械照搬 Python/C 运行时的设置代码。
- 读取必须处理分片、连续多帧、半个头部/正文、非法 JSON、超限长度和 EOF；发送必须串行并 flush。

### 2.3 MV3 生命周期

依据 [service worker 生命周期文档][2]，并核对 [Chrome 官方文档仓库原文][3]：

- Chrome 105 起，`connectNative()` 的连接可以保持扩展 service worker 存活。
- 主机崩溃或关闭时 Port 关闭，worker 随后仍可能被终止；官方建议在 `onDisconnect` 中恢复连接。
- 普通 worker 通常会在 30 秒无活动后结束，全局变量随之丢失。
- 用户 profile 启动会触发 `runtime.onStartup`，应在顶层同步注册监听器，再异步读取配置。
- 定时器不能作为断连后长期调度的唯一依据。使用立即/短延迟重连配合 `chrome.alarms` 兜底，在 worker 再次启动时重新读配置并恢复连接。
- 若首版最低版本定为 Chrome 105，恢复 alarm 采用至少 1 分钟周期；不要依赖 Chrome 120 才支持的 30 秒 alarm。

资料限制：当前 Chrome 页面直连在本环境中失败，Native Messaging 页面通过搜索服务取得正文；生命周期规则另外读取了官方文档仓库原文（blob SHA `050206b3415167b1fd9a6574ac5ca149bfe9e819`）。Chromium 源码通过官方镜像 API 读取。源码与文档支持上述架构判断；进程归属、关闭行为与休眠恢复仍必须在 Windows 实机验证。

## 3. 旧实现存在的问题

以下 Rust 路径均指删除前的 `chromium-extension-monitor/`，不是当前工作区文件。

| 位置 | 代码行为 | 结果 |
| --- | --- | --- |
| `src/monitor/service.rs` | EOF 后设置 Warning、输出倒计时日志，随即 `break`、`stop()` | 未等待倒计时，也未调用任何终止操作 |
| `src/main.rs` / `src/config/cli.rs` | 全部启动都先交给 clap，但没有接收调用者 origin 和 `--parent-window` | Chrome 启动主机时可能因未知参数退出 |
| `src/utils/logger.rs` | 文件日志之外还装配 stdout 日志层 | 破坏 Native Messaging 消息帧 |
| `src/native_messaging/registration.rs` | 在 `NativeMessagingHosts` 父键下写一个具名值 | 不符合 Chrome 查找 host 子键默认值的方式；卸载路径也不对称 |
| 同上 | 注册命令失败只记日志，最后返回成功 | 安装结果不可信 |
| `src/main.rs` / `src/utils/mod.rs` | 普通启动中尝试提权并退出原进程 | 新进程无法据此继承 Chrome 原有消息管道 |
| `src/lib.rs` | 未导出遗留的 extension/process 模块 | 文件扫描与终止代码未接入实际执行路径 |
| 遗留 `src/extension/detector.rs` | 手动填写的未打包路径默认视为启用，并可用名称模糊匹配 | 文件存在不能证明浏览器已加载并启用指定扩展 |
| 遗留 `src/process/manager.rs` | 按进程名及包含匹配寻找全部目标进程 | 若直接复用，可能关闭无关实例 |
| 当前 `src/background/NativeMessagingClient.ts` | `connectNative()` 返回 Port 后立即设为 connected，并清零重试计数 | 未确认主机实际启动和守护进程就绪；异步失败时退避计数失真 |
| 同上 | 发心跳但未追踪 pong、超时及连接代次 | 主机不响应也可能显示在线；旧连接事件可能覆盖新状态 |
| 当前 `src/background/index.ts` | 配置变更监听只重新安排业务 alarm | Native Messaging 开关没有即时连接/断开效果 |
| 旧配置、README 与实际入口 | 仍描述轮询文件扫描、资源限制和完整倒计时 | 文档与可执行行为脱节 |

## 4. 重写架构

```mermaid
flowchart LR
    E[扩展 MV3 后台] <-->|Native Messaging / stdio| H[短生命周期 Native Host]
    H <-->|当前用户 Named Pipe| W[独立 Watchdog]
    W --> S[浏览器进程发现与状态机]
    S --> T[定向关闭对应浏览器实例]
    W --> N[本地倒计时提示与诊断]
    C[安装器 / 本地 CLI / 登录启动] --> W
```

采用一个 Rust 包，分别提供 `monitor`、`host` 两个可执行入口与管理 CLI。Host manifest 指向专用 host 可执行文件，使其参数协议与管理命令分离。

### Watchdog

- 用户主动运行或通过用户级登录启动运行，单用户单实例；不由 Native Host 作为唯一启动来源。
- 独立保存登记目标和保护开关，发现浏览器启动并维护状态机。
- 接收多个 Host 连接，按浏览器实例隔离会话，拥有全部倒计时和关闭决策。
- Host 意外退出时，通过 Named Pipe 断开和心跳超时发现故障，不依赖 Host 成功发送“断开通知”。
- 通知由本地程序产生；扩展禁用时依然能显示倒计时。

### Native Host

- 接收并校验 origin、兼容 `--parent-window` 参数，日志完全避开 stdout。
- 只处理消息帧、会话握手和本地 IPC 转发；stdin 读取与 IPC 响应发送不能相互阻塞。
- 只有 Watchdog 确认就绪并建立目标关联后，才向扩展发送 `ready`。
- EOF 后尝试报告连接关闭并退出；Watchdog 不能依赖这条报告到达。
- Watchdog 未运行时明确报告未就绪，不伪造“已受保护”。

### 扩展后台

- `NativeMessagingClient` 独占 Native Port。管理页经现有后台消息通道查询状态，不另开 Port。
- 开始连接即发送 hello，收到有效 ready 后才进入 connected。
- `protocolVersion`、`sessionId`、心跳序号与应答统一定义；用类型守卫校验外部消息。
- 主机 ready 与 Watchdog monitoring 分开显示；成功启动 Host 不等于保护已经启用。
- 配置开关即时生效；手动 disconnect 清理心跳、重连 timer 和恢复 alarm，旧 Port 回调按连接代次忽略。
- 所有时限由 Watchdog 的本地单调时钟计算，扩展传入的 timestamp 只用于诊断。

## 5. 登记范围与进程身份

登记目标至少包括：浏览器可执行文件规范化路径、user-data-dir、期望的扩展 ID、保护是否启用。运行实例另外记录根 PID、创建时间并持有必要进程句柄。

第一版必须明确以下边界：

- Chrome 同一 user-data-dir 下的多个 profile 可共用浏览器进程。OS 级终止不能承诺只关闭某个 profile。
- 首版以登记的**整个浏览器实例**作为关闭范围；推荐在独立 user-data-dir 中使用单个受保护 profile，端到端测试也采用该方式。
- 同一实例的另一个 profile 发来的心跳不能证明所有 profile 都受到保护。首版不声称覆盖多 profile、访客或无痕模式；如果要覆盖，需要独立需求与验证。
- origin 和 `--parent-window=0` 都不含可直接使用的 profile 路径。关联通过本地进程元数据、已登记路径与 Host 进程祖先链验证，不能只相信扩展自行填入的 PID。
- 无法唯一关联时进入诊断状态，禁止按进程名扩大关闭范围。
- 到期前重新校验实例身份和进程存活，避免 PID 复用、浏览器退出后重开导致旧倒计时作用于新实例。

初次登记应完成一次端到端握手后再启用保护。保护记录持久化后，即使扩展禁用、浏览器重新启动而完全没有 Host 连接，Watchdog 仍会发现该实例并执行启动等待流程。

## 6. 状态机与时间语义

| 状态 | 条件 | 转移与行为 |
| --- | --- | --- |
| `Idle` | 已启用保护，但目标浏览器未运行 | 发现目标实例后进入 `AwaitingExtension` |
| `AwaitingExtension` | 新实例启动，尚未建立有效会话 | 启动宽限内握手成功则 `Monitoring`；超时则 `GracePeriod` |
| `Monitoring` | 当前有效会话持续应答 | 连接关闭或心跳超时进入 `GracePeriod` |
| `GracePeriod` | 浏览器仍在，但扩展失联 | 有效新会话恢复则取消倒计时；到期仍失联进入 `Closing` |
| `Closing` | 最终复核仍不满足在线条件 | 请求正常关闭，等待短时限，仍存活则定向强制终止 |
| `Paused` | 用户通过本地 CLI 停止保护 | 不处置浏览器；恢复保护后重新评估 |
| `Faulted` | 目标身份不确定、无权限或配置异常 | 明确报告原因；不能标记为已保护或扩散终止目标 |

任何活动状态下，目标根进程退出均结束该实例的倒计时。浏览器新实例有新的身份和启动期限。

建议初始值：启动宽限 30 秒；正常心跳间隔 15 秒；心跳超时 45 秒；失联恢复倒计时 5 秒；请求正常关闭后的等待 3 秒。数值由最小实验校准后固定为配置默认值。

必须区分两种延迟：连接明确关闭后约 5 秒发起关闭；连接尚存但心跳失效时，最坏需要心跳超时再加 5 秒。若正常关闭等待结束后才强制终止，总时间还会增加 3 秒。界面与 README 不能统称为“任何禁用均在 5 秒内强杀”。

附加规则：

- 重复 EOF、失败握手、重连尝试不得推迟既有截止时间；只有有效会话恢复能取消倒计时。
- 同一实例可能短时有新旧两个 Host；过期 session 的断开不能撤销新 session 的健康状态。
- 最终关闭操作前再次处理已到达的恢复事件并复核截止时间，防止计时器竞争。
- 正常退出以实例进程退出为依据；关闭最后一个窗口不一定表示后台浏览器进程已经结束。
- 系统唤醒后给予一次有界的恢复窗口，避免用休眠期间没有心跳直接执行关闭；不按系统墙上时间判断超时。
- 扩展内关闭通信与本地停止保护是两个动作。已经登记并启用保护时，关闭通信会被视为失联；设置页必须提前说明，并提供本地暂停方式。

## 7. 配置、安装与诊断

- 配置和日志置于当前用户应用数据目录；配置合并顺序明确为默认值 → 文件 → 显式 CLI 值，完成合并后统一验证。
- 保留实际生效的配置：登记目标、启动/心跳/恢复时间、保护开关、日志策略。删除无实现的 CPU/内存限额、模糊名称匹配和扩展目录扫描选项。
- 使用 HKCU 安装，不在 Host 启动时请求提权。安装先验证扩展 ID 为 32 位 `a`–`p` 字符，再写 manifest、注册正确的子键默认值并回读校验。
- 注册表写入和卸载使用同一组键及同一视图；检测另一个视图中的冲突登记。部分安装失败返回错误，并回滚本次写入。
- 独立支持 `install`、`uninstall`、`status`、`doctor`、本地 `enable/disable` 和用户级登录启动管理；原生通信与保护启用各自可诊断。
- Named Pipe 限制当前用户访问，验证协议版本和已登记目标。这里不引入针对同一用户主动伪造的复杂防护。
- `doctor` 检查 manifest、origin、注册表视图、文件路径、Watchdog 可达性及完整握手，并输出具体失败环节。
- 首次安装默认不启用真实关闭；完成登记与诊断后，由用户明确启用保护。

## 8. 实施顺序与交付条件

### P0：最小原理验证

已完成的实测与原型入口见 [P0 可行性报告](./chromium-extension-monitor-feasibility.md) 和 [原型 README](../tools/native-monitor-probe/README.md)。当前验证只记录 `would_close`，真实关闭及生产安装仍需后续实现。

只实现一个合法 Native Host 和独立监控进程，在隔离的 Chrome user-data-dir 中验证：

1. HKCU 登记、中文/空格路径、Chrome 参数解析和真实双向消息帧。
2. MV3 后台立即握手、保持连接、主机失效后的重连。
3. 停用、卸载、重载扩展，以及关闭浏览器时，Host 与 Watchdog 的实际生命周期。
4. 从 Host 关联浏览器根进程和 user-data-dir；验证直接启动与支持的包装启动路径。
5. 扩展保持禁用后重启浏览器，Watchdog 能独立发现实例。

交付：记录实际 Chrome/Windows 版本、启动参数、进程关系和观测结果。若不能可靠关联目标，先调整支持范围，不能进入真实关闭开发。

### P1：可测试的 Rust 监控核心

实现配置、协议、会话表、状态机、时钟与 `BrowserController` 接口。先使用 fake clock 和模拟进程控制器验证全部状态转移；再接入 Windows Named Pipe、进程句柄和实例发现。

交付：无浏览器环境下可验证启动无连接、断连、超时、恢复、并发旧事件、休眠与 PID 复用。

### P2：真实关闭与本地管理

实现实例复核、正常关闭、强制终止、局部失败报告、桌面提示、用户级单实例运行、登记持久化与登录启动。真实终止测试只作用于测试创建的实例或子进程。

交付：Host 已退出时仍能倒计时；其他 user-data-dir 和其他浏览器不受影响；保护在浏览器重启及用户重新登录后能恢复。

### P3：扩展接入

重写 `src/background/NativeMessagingClient.ts`，修改 `src/background/index.ts` 的启动、配置变更和恢复 alarm 流程；在 `src/core` 定义协议与状态类型，更新 `NativeMessagingSettings.tsx` 显示连接、保护与诊断状态。按实际 API 需求添加最低 Chrome 版本。

交付：立即 hello、有效 ready 才连接成功、pong 检测、无上限但有退避的恢复、手动关闭通信后不再重连、旧 Port 不干扰新 Port。恢复 alarm 与现有业务 alarm 使用独立名称。

### P4：验收与文档

Rust：`cargo fmt --check`、`cargo clippy --all-targets -- -D warnings`、`cargo test`、release 构建。扩展：`npm run typecheck`、`npm run lint`、`npm run test -- --run`、`npm run build`。基线已有失败须与新增回归区分记录。

补充受影响的后台 mock 与连接测试；在关闭 DevTools 的条件下运行真实 Chrome 场景，避免调试会话掩盖生命周期问题。更新安装、卸载、故障排查、支持范围及准确的超时说明。

## 9. 验收矩阵

| 场景 | 预期 |
| --- | --- |
| 未安装 Host / origin 不匹配 / 注册错误 | 具体错误，界面不显示已保护 |
| 创建 Port 后主机立即退出 | 握手失败，累计退避，worker 重启后仍有恢复入口 |
| 正常连接超过 5 分钟 | 连接健康，服务后台正常，无错误倒计时 |
| 扩展停用或卸载 | Watchdog 保持存活，约 5 秒后开始关闭登记实例 |
| 倒计时内恢复扩展 | 有效新会话取消关闭，不受旧 Host 退出影响 |
| 扩展重载或更新 | 短暂断连可恢复，不重复注册会话或延长失联期限 |
| Host 卡住但管道未断 | 心跳超时进入倒计时，不能永久伪在线 |
| 扩展已禁用后重启浏览器 | 独立发现实例，启动宽限到期后处置 |
| 浏览器正常退出或崩溃 | 结束旧实例倒计时，不关闭后续新实例 |
| 其他浏览器或另一个 user-data-dir 同时运行 | 不被误关闭 |
| 同一 user-data-dir 多 profile | 说明整个实例的关闭范围；不宣称单 profile 隔离 |
| 系统休眠与唤醒、系统时间变更 | 有界恢复，不因墙上时间跳变立即关闭 |
| 部分帧、非法 JSON、超限、中文消息 | 正确解析或明确拒绝，stdout 无日志污染 |
| 关闭扩展通信 / 本地停止保护 | 前者按失联处理并明确提示；后者不再处置 |
| 重复安装、安装部分失败、卸载后复查 | 登记可回读，失败不报成功，资源清理一致 |
| 无足够权限关闭或进程身份无法确定 | 报告故障，不扩大关闭范围，不声称成功 |

## 10. 参考资料

[1]: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
[2]: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
[3]: https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/extensions/mv3/service_workers/service-worker-lifecycle/index.md
[4]: https://github.com/chromium/chromium/blob/main/chrome/browser/extensions/api/messaging/native_message_process_host.cc
[5]: https://github.com/chromium/chromium/blob/main/chrome/browser/extensions/api/messaging/launch_context_win.cc
[6]: https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/api-samples/nativeMessaging/host/native-messaging-example-host
[7]: https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/api-samples/nativeMessaging/host/install_host.bat

- [Chrome Native Messaging][1]：注册、启动参数、生命周期、消息协议与诊断。
- [Chrome service worker 生命周期][2]及[官方文档仓库原文][3]：Chrome 105 起 Native Port 保活，以及断连后恢复。
- [Chromium 主机实现][4]：主机析构时的进程清理。
- [Chromium Windows 启动实现][5]：直接启动和 cmd 包装路径。
- [官方 Python Host 示例][6]与[Windows 注册脚本][7]：字节帧、EOF 和注册表默认值的参考。
