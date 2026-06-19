use clap::Parser;
use std::path::PathBuf;

/// CLI 参数定义
#[derive(Parser, Debug, Clone)]
#[command(name = "chromium-extension-monitor")]
#[command(author = "Your Name")]
#[command(version = "0.1.0")]
#[command(about = "监控 Chromium 扩展并强制执行合规性", long_about = None)]
pub struct CliArgs {
    /// 配置文件路径
    #[arg(short, long, value_name = "PATH", default_value = "./config.toml")]
    pub config: PathBuf,

    /// 延迟终止时间（秒）
    #[arg(short, long, value_name = "SECONDS")]
    pub delay: Option<u64>,

    /// 检查间隔（秒）
    #[arg(short, long, value_name = "SECONDS")]
    pub interval: Option<u64>,

    /// Chromium 用户数据目录
    #[arg(short, long, value_name = "DIR")]
    pub path: Option<PathBuf>,

    /// 目标扩展 ID
    #[arg(short, long, value_name = "EXT_ID")]
    pub extension: Option<String>,

    /// 详细日志输出
    #[arg(short, long)]
    pub verbose: bool,

    /// 静默模式
    #[arg(short, long)]
    pub quiet: bool,

    /// 隐藏控制台窗口（Windows）
    #[arg(long)]
    pub no_console: bool,

    /// 安装 Native Messaging 主机
    #[arg(long)]
    pub install_native_host: bool,

    /// 卸载 Native Messaging 主机
    #[arg(long)]
    pub uninstall_native_host: bool,

    /// 扩展 ID（用于 Native Messaging 注册）
    #[arg(long, value_name = "EXT_ID")]
    pub extension_id: Option<String>,
}

impl CliArgs {
    /// 转换为配置对象
    pub fn into_config(self) -> crate::config::Config {
        use crate::config::Config;

        let mut config = Config::default();

        // 应用 CLI 覆盖
        if let Some(delay) = self.delay {
            config.monitor.kill_delay = delay;
        }

        if let Some(interval) = self.interval {
            config.monitor.check_interval = interval;
        }

        if let Some(path) = self.path {
            config.chromium.user_data_dirs = vec![path];
        }

        if let Some(ext_id) = self.extension {
            config.extension.target_extensions = vec![ext_id];
        }

        // 根据 verbose/quiet 调整日志级别
        if self.verbose {
            config.logging.level = "debug".to_string();
        } else if self.quiet {
            config.logging.level = "error".to_string();
        }

        // 根据 no_console 调整控制台显示
        if self.no_console {
            config.monitor.show_console = false;
        }

        config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_args_default() {
        let args = CliArgs::parse_from(["chromium-extension-monitor"]);
        assert_eq!(args.config, PathBuf::from("./config.toml"));
        assert!(args.delay.is_none());
        assert!(args.interval.is_none());
        assert!(args.path.is_none());
        assert!(args.extension.is_none());
        assert!(!args.no_console);
        assert!(!args.verbose);
        assert!(!args.quiet);
        assert!(!args.install_native_host);
        assert!(!args.uninstall_native_host);
    }

    #[test]
    fn test_cli_args_with_values() {
        let args = CliArgs::parse_from([
            "chromium-extension-monitor",
            "-c",
            "custom.toml",
            "-d",
            "10",
            "-i",
            "2",
            "-p",
            "/path/to/chromium",
            "-e",
            "extension-id-123",
            "--no-console",
            "-v",
        ]);

        assert_eq!(args.config, PathBuf::from("custom.toml"));
        assert_eq!(args.delay, Some(10));
        assert_eq!(args.interval, Some(2));
        assert_eq!(args.path, Some(PathBuf::from("/path/to/chromium")));
        assert_eq!(args.extension, Some("extension-id-123".to_string()));
        assert!(args.no_console);
        assert!(args.verbose);
    }

    #[test]
    fn test_cli_args_install_native_host() {
        let args = CliArgs::parse_from([
            "chromium-extension-monitor",
            "--install-native-host",
            "--extension-id",
            "abcdefghijklmnopqrstuvwx",
        ]);
        assert!(args.install_native_host);
        assert_eq!(
            args.extension_id,
            Some("abcdefghijklmnopqrstuvwx".to_string())
        );
    }

    #[test]
    fn test_cli_to_config() {
        let args = CliArgs::parse_from([
            "chromium-extension-monitor",
            "-d",
            "10",
            "-p",
            "/path/to/chromium",
            "-e",
            "ext-123",
        ]);

        let config = args.into_config();
        assert_eq!(config.monitor.kill_delay, 10);
        assert_eq!(config.chromium.user_data_dirs.len(), 1);
        assert_eq!(config.extension.target_extensions.len(), 1);
        assert_eq!(config.extension.target_extensions[0], "ext-123");
    }
}
