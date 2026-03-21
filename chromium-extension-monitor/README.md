# Chromium Extension Monitor

监控 Chromium 浏览器扩展并强制执行合规性的 Rust 工具。

## 功能特性

- 🔍 **实时监控**：持续监控 bilibili-blocker 扩展的安装状态
- ⏱️ **延迟终止**：检测到扩展卸载后 5 秒倒计时终止浏览器
- ⚙️ **灵活配置**：支持配置文件和 CLI 参数
- 🚀 **极致性能**：CPU < 1%, 内存 < 20MB
- 📝 **详细日志**：结构化日志记录，便于排查问题

## 安装

### 从源码编译

```bash
# 克隆仓库
cd chromium-extension-monitor

# 编译发布版本
cargo build --release

# 可执行文件位于 target/release/chromium-extension-monitor
```

### 系统要求

- Windows 10/11, macOS 10.15+, 或 Linux
- Rust 1.70+
- Chromium/Chrome/Edge 浏览器

## 使用方法

### 快速开始

1. 复制配置文件：
```bash
cp config.toml.example config.toml
```

2. 编辑 `config.toml`，填入你的 bilibili-blocker 扩展 ID

3. 运行程序：
```bash
# 使用配置文件
chromium-extension-monitor

# 或以管理员权限运行（推荐）
# Windows: 右键 -> 以管理员身份运行
# Linux/macOS: sudo chromium-extension-monitor
```

### CLI 参数

```bash
chromium-extension-monitor [OPTIONS]

OPTIONS:
    -c, --config <PATH>          配置文件路径 [默认：./config.toml]
    -d, --delay <SECONDS>        延迟终止时间（秒）[默认：5]
    -i, --interval <SECONDS>     检查间隔（秒）[默认：1]
    -p, --path <DIR>             Chromium 用户数据目录
    -e, --extension <EXT_ID>     目标扩展 ID
    -v, --verbose                详细日志输出
    -q, --quiet                  静默模式
    --no-console                 隐藏控制台窗口（Windows）
    -h, --help                   显示帮助信息
    -V, --version                显示版本号
```

### 示例

```bash
# 使用自定义配置文件
chromium-extension-monitor -c /path/to/config.toml

# 覆盖延迟时间
chromium-extension-monitor -d 10

# 指定扩展 ID
chromium-extension-monitor -e "your-extension-id"

# 隐藏控制台窗口（Windows）
chromium-extension-monitor --no-console
```

## 配置说明

### 获取扩展 ID

1. 打开 Chrome/Chromium
2. 访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 找到 bilibili-blocker 扩展
5. 复制 ID（类似 `abcdefghijklmnopqrstuvwx`）

### 配置文件示例

```toml
[monitor]
check_interval = 1      # 检查间隔（秒）
kill_delay = 5          # 延迟终止时间（秒）
enabled = true          # 是否启用

[extension]
target_extensions = ["your-extension-id-here"]
extension_name = "bilibili-blocker"

[chromium]
user_data_dirs = [
    "C:\\Users\\YourName\\AppData\\Local\\Chromium\\User Data"
]
process_names = ["chromium.exe", "chrome.exe"]

[logging]
level = "info"
file_path = "logs/chromium-monitor.log"
```

## 工作原理

1. **监控循环**：每秒检查一次扩展安装状态
2. **检测扩展**：扫描 Chromium 用户数据目录的 Extensions 文件夹
3. **警告倒计时**：检测到扩展缺失后启动 5 秒倒计时
4. **终止进程**：倒计时结束后终止所有 Chromium 进程

## 开发

### 项目结构

```
chromium-extension-monitor/
├── src/
│   ├── config/          # 配置管理
│   ├── extension/       # 扩展检测
│   ├── process/         # 进程管理
│   ├── monitor/         # 监控服务
│   ├── utils/           # 工具函数
│   ├── error.rs         # 错误类型
│   ├── lib.rs           # 库入口
│   └── main.rs          # 程序入口
├── tests/               # 测试文件
├── benches/             # 性能基准测试
└── config.toml.example  # 配置文件示例
```

### 运行测试

```bash
# 运行所有测试
cargo test

# 运行特定测试
cargo test config

# 运行性能基准测试
cargo bench
```

### 性能优化

项目已启用以下优化：

- LTO（链接时优化）
- 单一代码生成单元
- 最高优化级别
- 去除调试符号

## 故障排查

### 常见问题

**Q: 程序无法终止 Chromium 进程**
A: 确保以管理员权限运行。Windows 用户请右键点击程序 -> 以管理员身份运行。

**Q: 检测不到扩展**
A: 检查配置文件中填写的扩展 ID 是否正确，以及 Chromium 用户数据目录路径是否正确。

### 日志位置

默认日志文件位置：`logs/chromium-monitor.log`

查看日志：
```bash
# Linux/macOS
tail -f logs/chromium-monitor.log

# Windows
Get-Content logs/chromium-monitor.log -Wait -Tail 50
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 致谢

- [Cold Turkey](https://getcoldturkey.com/) - 灵感来源
- [sysinfo](https://github.com/GuillaumeGomez/sysinfo) - 进程管理
- [clap](https://github.com/clap-rs/clap) - CLI 参数解析
