use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 主配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// 监控配置
    #[serde(default)]
    pub monitor: MonitorConfig,

    /// 扩展配置
    #[serde(default)]
    pub extension: ExtensionConfig,

    /// Chromium 配置
    #[serde(default)]
    pub chromium: ChromiumConfig,

    /// 系统托盘配置
    #[serde(default)]
    pub tray: TrayConfig,

    /// 日志配置
    #[serde(default)]
    pub logging: LoggingConfig,

    /// 性能配置
    #[serde(default)]
    pub performance: PerformanceConfig,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            monitor: MonitorConfig::default(),
            extension: ExtensionConfig::default(),
            chromium: ChromiumConfig::default(),
            tray: TrayConfig::default(),
            logging: LoggingConfig::default(),
            performance: PerformanceConfig::default(),
        }
    }
}

/// 监控配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorConfig {
    /// 监控检查间隔（秒）
    #[serde(default = "default_check_interval")]
    pub check_interval: u64,

    /// 延迟终止时间（秒）
    #[serde(default = "default_kill_delay")]
    pub kill_delay: u64,

    /// 是否启用监控
    #[serde(default = "default_true")]
    pub enabled: bool,

    /// 是否显示控制台窗口（Windows）
    #[serde(default = "default_true")]
    pub show_console: bool,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        Self {
            check_interval: default_check_interval(),
            kill_delay: default_kill_delay(),
            enabled: true,
            show_console: true,
        }
    }
}

fn default_check_interval() -> u64 {
    1
}

fn default_kill_delay() -> u64 {
    5
}

/// 扩展配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionConfig {
    /// 要监控的扩展 ID 列表
    #[serde(default)]
    pub target_extensions: Vec<String>,

    /// 扩展名称（用于日志）
    #[serde(default = "default_extension_name")]
    pub extension_name: String,
}

impl Default for ExtensionConfig {
    fn default() -> Self {
        Self {
            target_extensions: vec![],
            extension_name: default_extension_name(),
        }
    }
}

fn default_extension_name() -> String {
    "bilibili-blocker".to_string()
}

/// Chromium 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChromiumConfig {
    /// Chromium 用户数据目录路径（支持多个）
    #[serde(default)]
    pub user_data_dirs: Vec<PathBuf>,

    /// 要监控的进程名称
    #[serde(default = "default_process_names")]
    pub process_names: Vec<String>,
}

impl Default for ChromiumConfig {
    fn default() -> Self {
        Self {
            user_data_dirs: vec![],
            process_names: default_process_names(),
        }
    }
}

fn default_process_names() -> Vec<String> {
    vec!["chromium.exe".to_string(), "chrome.exe".to_string()]
}

/// 系统托盘配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrayConfig {
    /// 是否显示系统托盘
    #[serde(default = "default_true")]
    pub enabled: bool,

    /// 托盘图标路径（可选）
    #[serde(default)]
    pub icon_path: Option<PathBuf>,
}

impl Default for TrayConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            icon_path: None,
        }
    }
}

/// 日志配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    /// 日志级别：trace, debug, info, warn, error
    #[serde(default = "default_log_level")]
    pub level: String,

    /// 日志文件路径
    #[serde(default = "default_log_path")]
    pub file_path: String,

    /// 日志文件大小（MB）
    #[serde(default = "default_log_max_size")]
    pub max_size: u64,

    /// 保留的日志文件数量
    #[serde(default = "default_log_max_files")]
    pub max_files: usize,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            level: default_log_level(),
            file_path: default_log_path(),
            max_size: default_log_max_size(),
            max_files: default_log_max_files(),
        }
    }
}

fn default_log_level() -> String {
    "info".to_string()
}

fn default_log_path() -> String {
    "chromium-monitor.log".to_string()
}

fn default_log_max_size() -> u64 {
    10
}

fn default_log_max_files() -> usize {
    5
}

/// 性能配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    /// CPU 使用率限制（百分比）
    #[serde(default = "default_cpu_limit")]
    pub cpu_limit: u8,

    /// 内存使用限制（MB）
    #[serde(default = "default_memory_limit")]
    pub memory_limit: u64,
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            cpu_limit: default_cpu_limit(),
            memory_limit: default_memory_limit(),
        }
    }
}

fn default_cpu_limit() -> u8 {
    5
}

fn default_memory_limit() -> u64 {
    50
}

fn default_true() -> bool {
    true
}

impl Config {
    /// 从文件加载配置
    pub fn from_file(path: &PathBuf) -> crate::Result<Self> {
        use std::fs;

        if !path.exists() {
            return Err(crate::error::ConfigError::FileNotFound(path.display().to_string()).into());
        }

        let content = fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content).map_err(|e| {
            crate::error::ConfigError::ParseError(format!("TOML 解析失败：{}", e))
        })?;

        config.validate()?;
        Ok(config)
    }

    /// 验证配置
    pub fn validate(&self) -> crate::Result<()> {
        if self.monitor.check_interval == 0 {
            return Err(crate::error::ConfigError::ValidationError(
                "check_interval 必须大于 0".to_string(),
            )
            .into());
        }

        if self.monitor.kill_delay == 0 {
            return Err(crate::error::ConfigError::ValidationError(
                "kill_delay 必须大于 0".to_string(),
            )
            .into());
        }

        if self.performance.cpu_limit > 100 {
            return Err(crate::error::ConfigError::ValidationError(
                "cpu_limit 必须在 0-100 之间".to_string(),
            )
            .into());
        }

        Ok(())
    }

    /// 合并配置（CLI 覆盖配置文件）
    pub fn merge(&mut self, other: Config) {
        // 如果 CLI 提供了值，则覆盖
        if !other.extension.target_extensions.is_empty() {
            self.extension.target_extensions = other.extension.target_extensions;
        }

        if !other.chromium.user_data_dirs.is_empty() {
            self.chromium.user_data_dirs = other.chromium.user_data_dirs;
        }

        if other.monitor.kill_delay != default_kill_delay() {
            self.monitor.kill_delay = other.monitor.kill_delay;
        }

        if other.monitor.check_interval != default_check_interval() {
            self.monitor.check_interval = other.monitor.check_interval;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.monitor.check_interval, 1);
        assert_eq!(config.monitor.kill_delay, 5);
        assert!(config.monitor.enabled);
        assert_eq!(config.extension.extension_name, "bilibili-blocker");
    }

    #[test]
    fn test_config_validation() {
        let mut config = Config::default();
        assert!(config.validate().is_ok());

        config.monitor.check_interval = 0;
        assert!(config.validate().is_err());

        config = Config::default();
        config.monitor.kill_delay = 0;
        assert!(config.validate().is_err());

        config = Config::default();
        config.performance.cpu_limit = 101;
        assert!(config.validate().is_err());
    }
}
