# Windows 桌面体验实现与验收

本轮优先交付 Windows 提醒、日常控制、配置维护和发布流程。代码已实现并完成本地回归；Cargo 发布及 Linux/macOS 支持未开启。

## 功能与提交

| 提交 | 功能 |
| --- | --- |
| `a4e87a4` | 基于状态转换的通知策略，启动去抖、失联去重和恢复撤销 |
| `97938f5` | Windows Toast、用户级通知身份/开始菜单/协议入口、可操作倒计时与状态窗口 |
| `425b6b2` | 托盘状态、双击重开、暂停恢复、诊断/通知/日志/退出、系统 DPI 缩放及清理 |
| `d1423d7` | 首次配置、文件选择、错误提示、配置备份修复、升级保留时限和旧自启迁移 |
| `0071718` | 从新发行目录启动引导升级，确保使用新分发的程序 |
| `6e13bae` | 复用检查、Windows 生命周期验收、完整版本化 ZIP、校验清单和标签发布 |

## 用户体验

- 双击发行目录的 `bilibili-focus-watchdog.exe` 进入配置引导，选择浏览器、类型、独立目录和扩展 ID。保存后启动安装的版本，保护仍暂停。
- 已安装的开始菜单入口打开状态窗口。托盘提供日常操作，关闭窗口只是隐藏；退出操作明确禁用保护并等待后台进程退出。
- 未检测到扩展和持续失联由 Watchdog 发送 Windows 通知；扩展停用后仍可提醒。
- 同一失联事件不重复通知，恢复/暂停后撤销；关闭倒计时后，本次事件内不立即重现。
- 通知的协议动作可以打开状态或暂停保护；只接受本安装的已知动作。
- 错误 ID、无效路径、未握手等问题有明确反馈。诊断结果可在窗口内阅读，详情保存为本地 JSON。
- 损坏配置先备份再重建；正常升级保留时限和适用的验证记录，停止旧进程后再替换文件。
- 更换范围时不沿用旧默认浏览器回退，避免扩大关闭范围。
- 卸载清理本安装的通知身份、协议、快捷方式、自启和主机登记；配置/日志/二进制保留情况明确告知。

## 验证

- Rust：33 项测试通过，包含通知去重/撤销、动作限制和范围变更约束；fmt、clippy `-D warnings` 通过。
- 安装：Unicode 路径、后台启动、握手启用门槛、自启开关、诊断、卸载、回滚与视图冲突检查通过。
- release 桌面：`desktop-n1ssbvql/result.json` 记录 Windows 接受通知且历史可查询、托盘登记和重开、倒计时关闭不重现、GUI 暂停、Windows 协议激活暂停与清理通过。
- release 配置：最终 `setup-81q77hyl/result.json` 验证首次引导、输入校验、GUI 安装、可读诊断、从发行目录双击完成 GUI 升级、时限保留及损坏配置备份。
- release 浏览器：`acceptance-1792914476955-中文 space/results.json` 完整通过。正式 `dist/` 扩展与原生程序完成 65 秒心跳、管理页状态、重连、重载、worker 冷启动恢复、暂停、停用/卸载实际关闭、无扩展重启关闭及无关实例隔离。
- 扩展：22 个文件、233 项测试通过；lint、typecheck 与生产构建通过。
- 打包：6 项 Python 测试通过，检查版本、三个 helper、x64 PE、ZIP 根目录和校验清单。
- 工作流：固定版本 actionlint 本地检查通过。GitHub 托管工作流尚未远程运行，本轮没有推送、打标签或创建 Release。

原始记录位于忽略的 `chromium-extension-monitor/artifacts/`。交互测试仅操作自己创建的窗口、浏览器与安装；不提交浏览器 profile。

## 验证边界

Windows 通知接口成功及通知历史已验证，不能据此断言用户已经在屏幕上看见。没有切换系统免打扰、显示器缩放或让用户电脑注销/物理休眠；这些场景仍需在实际使用环境中进行视觉和系统验收。

CI 自动运行可在无交互桌面完成的安装/浏览器测试；`tests/desktop.py` 与 `tests/setup.py` 保留为 Windows 交互桌面测试，不在托管 CI 中声称视觉通过。

## 使用与复现

- [Windows 使用说明](../chromium-extension-monitor/README.md)
- [CI/CD 触发、产物与标签规则](./github-action.md)

```powershell
cargo build --release --manifest-path chromium-extension-monitor/Cargo.toml
$env:FOCUS_BUILD_PROFILE = 'release'
python chromium-extension-monitor/tests/install.py
python chromium-extension-monitor/tests/desktop.py
python chromium-extension-monitor/tests/setup.py
node chromium-extension-monitor/tests/browser.mjs
```

脚本可传入 Chromium 路径；默认使用本地 Playwright 缓存的 Chromium。未有该缓存时，使用固定版本 Chrome for Testing。
