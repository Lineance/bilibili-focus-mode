# 下一阶段计划：系统提醒、Cargo 分发与跨平台发布

状态：计划，尚未执行本轮 CI/CD 改造或公开发布。保留用户要求：每个可独立验收的功能完成测试后单独 Git commit。

## 1. 目标与现状

目标：扩展失联时用户收到操作系统提醒；监控程序可用 Cargo 安装；GitHub 正确测试、打包与发布；其他平台按实际实现及验收逐步加入。

现状已经核对：

- Windows 原生进程监督、扩展握手及实际关闭已实现。
- `show_countdown()` 目前创建一个 Windows STATIC 窗口，只在恢复期及关闭阶段显示。它不是 Windows 通知中心 Toast，启动后长期未检测到扩展时也没有独立系统通知。
- `.github/workflows/native-monitor.yml` 已有 Windows Rust 检查与构建；扩展 CI 只覆盖 main/master，使用 Node 20。
- 旧 `build-and-release.yml` 仍引用已不存在的 `chromium-extension-monitor.exe`，没有按三个实际二进制打包，也没有 crates.io 发布。
- Cargo 包为 `chromium-extension-monitor`，`publish = false`；缺少 description、license、repository 等正式发布元数据，仓库中也未找到许可证正文。
- 核心状态机/协议可复用，但二进制入口直接依赖 Windows 专属模块。不能直接增加 Linux/macOS 发布矩阵就声称支持这些平台。

## 2. 包名与命令

建议采用 **`bili-warden`**，中文显示名“Bilibili 专注守护”。备选为 `bili-sentinel`；若首选被占用，再考虑 `bilibili-focus-warden`。名称可用性尚未核验，正式更名前检查 crates.io 与已有同名项目。

目标命名：

| 项目 | 名称 |
| --- | --- |
| Cargo 包 | `bili-warden` |
| 用户命令 | `bili-warden` |
| 后台程序 | `bili-warden-daemon` |
| Native Host | `bili-warden-host` |

目标安装体验是：

```powershell
cargo install bili-warden --locked
bili-warden install --browser "C:\path\chrome.exe" --user-data-dir "D:\FocusBrowser" --extension-id "<32位扩展ID>" --autostart
bili-warden start
bili-warden doctor
bili-warden enable
```

这是计划中的命令，当前尚未发布这个包。`cargo install` 只安装三个可执行文件；浏览器登记、系统通知身份与登录启动仍由显式的 `install` 完成。不得让 Cargo 构建脚本修改用户注册表或登录项。

更名期间保留 `com.bilibili.focus.monitor` 主机名、消息协议及现有数据目录，避免扩展必须同时更换 host name，或丢失已经登记的配置。旧文件名和 CLI 的迁移范围在更名提交中明确；不永久依赖通用的 `monitor.exe` 名称。

## 3. 阶段一：先修复现有 GitHub CI/CD

这一阶段落实原先“添加对应 CI/CD”的请求，先按当前 Windows 实现发布可用产物。

- 将扩展 CI 的 Node 版本与本地验证环境统一到 Node 24；显式使用 `npm run test -- --run`。
- Pull Request 覆盖开发分支；分支 push 执行相应检查，并用 concurrency 合并同分支重复检查。
- 提取可复用的扩展与原生构建步骤，发布任务使用同样的质量检查，避免“CI 测试一套、Release 另编译一套”。
- Windows 运行 fmt、clippy、Rust 测试、发行构建；下载固定版本 Chrome for Testing，顺序运行安装验收与正式扩展的浏览器验收。
- 普通 PR 使用短时端到端验证；发布前或定时任务运行 310 秒心跳与完整生命周期验收。
- 原生 ZIP 包含三个可执行文件、README 和 SHA-256 清单；扩展独立打包，ZIP 根目录必须有 manifest.json。
- 手动触发默认只构建、测试、上传 artifact；创建公开 Release 只由匹配标签触发。
- 扩展继续使用 `vX.Y.Z`；原生程序采用独立的 `bili-warden-vX.Y.Z`，避免强行要求扩展 0.0.5 与原生 0.1.0 使用同一版本号。
- 校验标签与对应 manifest/package/Cargo 版本一致；只有所有必需检查和产物校验通过，才允许发布。

验收：分支/PR、手动构建、扩展标签、原生标签四条路径有明确行为；不再寻找旧 exe；失败不创建 Release；压缩包可按 README 正常安装。

## 4. 阶段二：完善 Windows 系统提醒

通知由 Watchdog 产生，扩展被停用后仍然有效。事件规则：

| 场景 | 提醒行为 |
| --- | --- |
| 浏览器刚启动、正在等待扩展 | 正常短暂启动不提醒；短暂去抖后仍未连接，提示扩展尚未检测到 |
| 启动等待耗尽、进入恢复期 | 提醒剩余恢复时间及即将关闭的登记实例 |
| 已连接的扩展突然失联 | 立即发出恢复期提醒 |
| 心跳超时 | 明确说明连接无响应，不断言一定被卸载 |
| 恢复连接 | 移除/替换失联通知，关闭倒计时窗，取消处置 |
| 浏览器未运行或本地保护已暂停 | 不发送缺失扩展告警 |
| 身份不确定、权限或配置故障 | 发送独立故障提醒，不能伪装成“扩展缺失” |

实现：

- 将通知触发从每 100 毫秒刷新窗口改为状态转换事件，同一次失联只首次通知，使用固定 Tag/Group 更新或替换。
- 增加 Windows 通知中心 Toast，现有倒计时窗保留为可见的恢复提示。
- 在用户级安装中登记未打包 Win32 程序所需的通知身份及相应快捷方式/激活入口；先用最小实验确认采用的 Windows API 与安装方式。
- 提供“查看状态/诊断”和“暂停保护”等明确动作；关闭通知本身不改变保护状态。
- 增加 `notify-test` 或等价诊断命令，检查通知身份及系统通知设置。
- 通知失败记录具体原因并回退到倒计时窗，不阻塞监督状态机。系统禁用通知或免打扰时，不把“调用 API 成功”宣称为“用户已经看到”。

验收：从真实安装位置、登录启动的进程和 Cargo 安装后的程序分别触发一次未连接、失联、恢复及故障；检查通知中心、去重和动作；断连后即使扩展进程不存在仍能提醒。

## 5. 阶段三：平台结构与 Cargo 发布

先整理最小平台边界，再发布源代码包，避免 Cargo 安装过程中暴露 Windows 导入错误。

- 共用状态机、配置、协议、事件与命令语义。
- 平台实现围绕四类能力分开：进程识别/关闭、IPC、系统通知、安装与登录启动。不搭建额外的通用插件框架。
- 不再把 Windows 注册表字段作为所有系统的必填配置；增加明确的配置迁移与兼容读取。
- Windows 第一版保留完整功能。尚未支持的平台应给出清晰的构建/功能说明；不能安装一个空实现却显示保护已启用。
- 将 Cargo package、二进制及 CLI 迁移到上面的命名；确认三个 helper 都随 `cargo install` 安装，更新缺失 helper 的诊断。
- 移除 `publish = false`；补齐 Rust 最低版本、description、repository、readme、keywords/categories 和与仓库声明一致的 MIT 许可证正文。
- 明确 Cargo package 的 include/exclude：包含源码与构建所需文件，排除 target、浏览器 profile、验收日志、发行 ZIP 与本机配置。
- 本地运行 `cargo package --list`、`cargo package`、`cargo publish --dry-run`；验证干净源码归档，不依赖仓库外的文件。
- 在空的 Cargo 安装目录中测试安装、三个可执行文件、浏览器登记、升级与卸载。特别检查 Windows 正在运行的 exe 造成的更新锁定，文档要求升级前 stop。
- 发布前检查归档内容、名称归属、许可证与版本；真正的 `cargo publish` 是独立发布动作。

CI/CD 增量：原生标签通过验证后才产生 crates.io 发布候选。配置受保护的发布 environment；注册表支持且账号已配置时优先使用 Trusted Publishing，否则使用专用发布 token。公开发布完成后才更新安装说明为可实际运行的 crates.io 命令。

验收：`cargo install bili-warden --locked` 在声明支持的平台上得到完整可用程序；发布归档不含本机数据；Cargo 版本、标签和 Release 包一致。

## 6. 阶段四：Linux 支持

先实现 Linux x86_64，再决定是否增加 ARM64。

- 使用用户私有 Unix Domain Socket，验证对端用户身份，保持现有帧协议。
- 使用 `/proc` 的可执行文件、cmdline、进程启动时间识别实例；在可用内核上使用 pidfd 固定进程身份，设计旧内核的明确支持边界。
- 正常退出请求与最终终止分别实现；不能退化为 `pkill chrome`。
- 使用用户级 Native Messaging manifest、XDG 数据目录及 systemd --user 登录管理。
- 使用桌面 D-Bus 通知；没有通知服务或没有图形会话时明确报告状态。
- 验证 Chrome/Chromium 的普通安装；Flatpak/Snap 沙箱的主机可见性单独评估，未验证前不承诺支持。

验收：Linux 桌面环境中完成与 Windows 对等的握手、通知、停用/卸载、暂停、正常退出、重新启动、实例隔离与登录管理测试。CI 可使用隔离图形会话，但不能仅凭 headless 编译测试声明桌面通知可用。

## 7. 阶段五：macOS 支持

优先 Apple Silicon，之后补充 Intel。

- 使用 Unix Domain Socket 与用户权限隔离。
- 使用 macOS 进程信息 API、路径与启动时间关联实例；重新核对身份后才进行退出/终止。
- 使用用户 Library 下的 Native Messaging 配置、Application Support 数据目录和 LaunchAgent。
- 验证系统通知身份、授权和登录进程的实际显示行为；核实是否需要应用包或独立通知 helper。
- 将进程监督和通知界面所需权限分开，先确认正常关闭的权限需求，避免无依据地要求管理员或辅助功能权限。
- GitHub Release 的签名、公证和 Gatekeeper 体验单独验收；没有签名时明确说明分发状态。

验收：真实 macOS 桌面运行完整生命周期与系统通知测试，再发布该平台包。

## 8. 平台发布矩阵

| 平台 | 目标架构 | 发布条件 |
| --- | --- | --- |
| Windows | x86_64-pc-windows-msvc | 当前实现基础上补齐系统提醒，持续运行完整验收 |
| Linux | x86_64-unknown-linux-gnu | Linux 后端和桌面通知验收完成 |
| macOS Apple Silicon | aarch64-apple-darwin | macOS 后端、通知和分发体验验收完成 |
| Windows ARM64 / Linux ARM64 / macOS Intel | 对应 Rust target | 后续增加，不仅靠交叉编译开启 Release |

每个平台的版本产物包含相应可执行文件、使用说明和校验清单。Cargo 源代码包与 GitHub 二进制包使用同一版本源码，但不把“能编译”当作“实际监督及通知已经支持”。

## 9. 提交顺序

1. `ci: repair extension and native release packaging`
2. `refactor: isolate notification and platform events`
3. `feat(windows): notify on missing extension and connection loss`
4. `feat: name and package bili-warden for cargo installation`
5. `ci: validate crate packaging and gate registry publication`
6. `feat(linux): add supervision installation and desktop notifications`
7. `ci(linux): test lifecycle and publish validated binaries`
8. `feat(macos): add supervision launch agent and notifications`
9. `ci(macos): build and release verified platform artifacts`

每一步有自己的验收和 Git commit。通知先做最小系统集成验证；平台未通过真实运行验收时，不发布该平台的完整支持声明。
