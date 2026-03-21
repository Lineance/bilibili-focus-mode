mod cli;
mod file;

pub use cli::CliArgs;
pub use file::Config;
pub use file::ChromiumConfig;
pub use file::ExtensionConfig;
pub use file::LoggingConfig;
pub use file::MonitorConfig;
pub use file::PerformanceConfig;
pub use file::TrayConfig;

use std::path::PathBuf;

/// 配置管理器
#[derive(Debug)]
pub struct ConfigManager {
    config: Config,
    config_path: PathBuf,
}

impl ConfigManager {
    /// 创建配置管理器
    pub fn new(config_path: PathBuf) -> crate::Result<Self> {
        let config = if config_path.exists() {
            Config::from_file(&config_path)?
        } else {
            Config::default()
        };

        Ok(Self {
            config,
            config_path,
        })
    }

    /// 从 CLI 参数创建配置管理器
    pub fn from_cli(cli_args: CliArgs) -> crate::Result<Self> {
        let config_path = cli_args.config.clone();
        let cli_config = cli_args.into_config();

        let mut manager = Self::new(config_path)?;
        manager.merge(cli_config);
        Ok(manager)
    }

    /// 获取配置引用
    pub fn config(&self) -> &Config {
        &self.config
    }

    /// 获取配置可变引用
    pub fn config_mut(&mut self) -> &mut Config {
        &mut self.config
    }

    /// 合并配置
    pub fn merge(&mut self, other: Config) {
        self.config.merge(other);
    }

    /// 保存配置到文件
    pub fn save(&self) -> crate::Result<()> {
        use std::fs;

        let content = toml::to_string_pretty(&self.config).map_err(|e| {
            crate::error::ConfigError::ParseError(format!("TOML 序列化失败：{}", e))
        })?;

        fs::write(&self.config_path, content)?;
        Ok(())
    }

    /// 获取配置文件路径
    pub fn config_path(&self) -> &PathBuf {
        &self.config_path
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::io::Write;

    #[test]
    fn test_config_manager_default() {
        let temp_file = NamedTempFile::new().unwrap();
        let manager = ConfigManager::new(temp_file.path().to_path_buf()).unwrap();
        assert_eq!(manager.config().monitor.check_interval, 1);
    }

    #[test]
    fn test_config_manager_from_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, r#"
[monitor]
check_interval = 2
kill_delay = 10
"#).unwrap();

        let manager = ConfigManager::new(temp_file.path().to_path_buf()).unwrap();
        assert_eq!(manager.config().monitor.check_interval, 2);
        assert_eq!(manager.config().monitor.kill_delay, 10);
    }

    #[test]
    fn test_config_manager_merge() {
        let temp_file = NamedTempFile::new().unwrap();
        let mut manager = ConfigManager::new(temp_file.path().to_path_buf()).unwrap();

        let mut override_config = Config::default();
        override_config.monitor.kill_delay = 15;
        manager.merge(override_config);

        assert_eq!(manager.config().monitor.kill_delay, 15);
    }
}
