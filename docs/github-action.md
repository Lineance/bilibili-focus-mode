# GitHub CI/CD 使用说明

当前交付范围为 Chrome 扩展和 Windows x64 原生监控程序。Linux/macOS 和 crates.io 发布未在本阶段开启。

## 工作流结构

| 文件 | 用途 |
| --- | --- |
| `ci.yml` | 开发分支 push、PR、手动和每周长时检查 |
| `extension-build.yml` | 可复用扩展 lint、类型、单元测试、生产构建和打包 |
| `native-monitor.yml` | 可复用 Windows fmt、clippy、Rust 测试、安装/浏览器验收和打包 |
| `build-and-release.yml` | 标签发布及手动完整构建，复用上述同一组检查 |

使用 Node 24、Python 3.12 和 Rust stable。工作流定义由固定版本 actionlint 检查；打包工具有独立的 Python 单元测试。

## 开发检查

- 所有开发分支的代码 push 都可触发，不再限于 main/master；仅文档改动可跳过 push 检查。
- PR 不限制目标分支。
- 同一分支的新 CI 会取消过时运行，发布运行不互相取消。
- 扩展执行 `npm ci`、lint、typecheck、`npm run test -- --run` 和 build。
- Windows 执行 Cargo fmt、clippy `-D warnings`、测试和 `--locked --release` 构建。
- Windows 顺序运行 `tests/install.py` 与 `tests/browser.mjs`，使用固定的 Chrome for Testing `156.0.8078.4`。
- 普通 CI 观察 65 秒；手动 CI 和每周一 03:21 UTC 的计划任务观察 310 秒。

Windows GUI 的 `tests/desktop.py`、`tests/setup.py` 需要交互桌面。本地覆盖通知、托盘、引导与修复；GitHub 托管 runner 的自动测试不冒充真实通知可见性或高 DPI 视觉验收。

## 手动构建

仓库 Actions → **Build and Release** → Run workflow，选择需要构建的分支或 ref。

手动触发会运行完整检查与 310 秒浏览器验收，上传 artifacts，**不会创建公开 Release**。`native-monitor.yml` 和 `extension-build.yml` 是内部可复用工作流，不作为独立手动入口。

产物：

- `extension-dist`：供 Windows 生命周期验收复用的正式扩展目录。
- `extension-package`：扩展 ZIP 和组件校验清单。
- `native-package`：Windows ZIP 和组件校验清单。
- `windows-monitor-test-results`：有界的测试结果与状态事件，不包含浏览器 profile。

Actions 下载的 artifact 可能在外层再包一层 ZIP，里面是实际发行 ZIP。

## 标签发布

扩展与原生程序分别维护版本，不能强行要求两者版本号相同：

| 标签 | 校验来源 |
| --- | --- |
| `vX.Y.Z` | `package.json` 与 `src/manifest.json` 必须都为 X.Y.Z |
| `monitor-vX.Y.Z` | `chromium-extension-monitor/Cargo.toml` 的 package.version 必须为 X.Y.Z |

推送匹配的标签后，两部分都通过复用的质量检查、Windows 安装/浏览器验收和打包，才允许创建 Release。发布的是标签提交中的兼容组合，各个 ZIP 使用各自真实版本号。

准备扩展版本示例：

```bash
# 先将 package.json、package-lock.json、src/manifest.json 更新为一致版本并提交
# 以下版本仅为示例，需要与实际元数据一致
 git tag v0.0.7
 git push origin v0.0.7
```

准备原生版本示例：

```bash
# 先更新 Cargo.toml/Cargo.lock 版本并提交，或使用当前尚未发布的版本
 git tag monitor-v0.1.0
 git push origin monitor-v0.1.0
```

本说明不会代替实际版本检查。错误标签、元数据不一致、测试失败、缺少 helper 或错误架构都会阻止发布。需要仓库启用 Actions，并允许发布 job 使用 `contents: write`；其他 job 只有 `contents: read`。不需要额外上传个人 GitHub token。

## 发行包内容

扩展：`bilibili-focus-mode-v<扩展版本>.zip`，根目录直接包含 `manifest.json`，解压后可加载。

Windows：`bilibili-focus-monitor-v<原生版本>-windows-x64.zip`：

```text
monitor.exe
bilibili-focus-host.exe
bilibili-focus-watchdog.exe
README.md
BUILD-INFO.json
SHA256SUMS.txt
```

三个二进制均校验为 Windows x64 PE。`BUILD-INFO.json` 记录组件版本、标签与提交，内部清单校验每个文件。Release 另上传一份覆盖两个 ZIP 的 `SHA256SUMS.txt`。

工作流已移除旧的单一 `chromium-extension-monitor.exe` 路径，不再发布只有一个 helper 的不完整原生包。

## 本地验证相同打包逻辑

```powershell
python -m unittest discover -s .github/scripts -p 'test_*.py' -v
npm run build
cargo build --locked --release --manifest-path chromium-extension-monitor/Cargo.toml
python .github/scripts/package_release.py build --component extension --out .cache/release/extension
python .github/scripts/package_release.py build --component native --out .cache/release/native
python .github/scripts/package_release.py validate-tag --tag monitor-v0.1.0
```

打包脚本不修改登记、不启动监控、不执行 `cargo publish`。正常 Windows 安装使用发行包中的图形引导，具体见 [原生程序说明](../chromium-extension-monitor/README.md)。
