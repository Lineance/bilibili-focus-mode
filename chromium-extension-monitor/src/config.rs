use std::{io, path::PathBuf};

use serde::{Deserialize, Serialize};

pub const HOST_NAME: &str = "com.bilibili.focus.monitor";
pub const PROTOCOL_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Target {
    pub browser_path: PathBuf,
    pub user_data_dir: PathBuf,
    pub extension_id: String,
    #[serde(default)]
    pub allow_default_profile: bool,
    #[serde(default = "default_browser")]
    pub registry_browser: String,
}

fn default_browser() -> String {
    "chrome".into()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default, deny_unknown_fields)]
pub struct Timing {
    pub startup_ms: u64,
    pub heartbeat_timeout_ms: u64,
    pub grace_ms: u64,
    pub close_wait_ms: u64,
    pub resume_ms: u64,
}
impl Default for Timing {
    fn default() -> Self {
        Self {
            startup_ms: 30_000,
            heartbeat_timeout_ms: 45_000,
            grace_ms: 5_000,
            close_wait_ms: 3_000,
            resume_ms: 30_000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Config {
    pub version: u32,
    pub target: Target,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub timing: Timing,
}

pub fn valid_extension_id(value: &str) -> bool {
    value.len() == 32 && value.bytes().all(|byte| (b'a'..=b'p').contains(&byte))
}
impl Config {
    pub fn validate(&self) -> io::Result<()> {
        let invalid = |message: &str| io::Error::new(io::ErrorKind::InvalidInput, message);
        if self.version != 1 {
            return Err(invalid("unsupported config version"));
        }
        if !valid_extension_id(&self.target.extension_id) {
            return Err(invalid("extension ID must contain exactly 32 letters a-p"));
        }
        if !self.target.browser_path.is_absolute() || !self.target.user_data_dir.is_absolute() {
            return Err(invalid(
                "browser and user data directory paths must be absolute",
            ));
        }
        if !matches!(self.target.registry_browser.as_str(), "chrome" | "chromium") {
            return Err(invalid("registryBrowser must be chrome or chromium"));
        }
        if self.timing.heartbeat_timeout_ms < 30_000 {
            return Err(invalid(
                "heartbeatTimeoutMs must be at least 30000 for the extension's 15-second heartbeat",
            ));
        }
        for value in [
            self.timing.startup_ms,
            self.timing.heartbeat_timeout_ms,
            self.timing.grace_ms,
            self.timing.close_wait_ms,
            self.timing.resume_ms,
        ] {
            if !(100..=300_000).contains(&value) {
                return Err(invalid(
                    "timing values must be between 100 and 300000 milliseconds",
                ));
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn extension_ids_are_exact_not_name_matches() {
        assert!(valid_extension_id("abcdefghijklmnopabcdefghijklmnop"));
        for id in [
            "",
            "test",
            "abcdefghijklmnopabcdefghijklmnox",
            "ABCDEFGHIJKLMNOPABCDEFGHIJKLMNOP",
        ] {
            assert!(!valid_extension_id(id));
        }
    }
    #[test]
    fn rejects_timeouts_shorter_than_a_healthy_extension_can_satisfy() {
        let mut config = Config {
            version: 1,
            enabled: false,
            target: Target {
                browser_path: std::env::current_exe().unwrap(),
                user_data_dir: std::env::temp_dir(),
                extension_id: "abcdefghijklmnopabcdefghijklmnop".into(),
                allow_default_profile: false,
                registry_browser: "chrome".into(),
            },
            timing: Timing::default(),
        };
        config.timing.heartbeat_timeout_ms = 1000;
        assert!(config.validate().is_err());
        config.timing.heartbeat_timeout_ms = 30000;
        assert!(config.validate().is_ok());
    }
    #[test]
    fn rejects_unknown_or_unimplemented_configuration_fields() {
        assert!(serde_json::from_str::<Timing>(r#"{"cpuLimit":5}"#).is_err());
        assert_eq!(
            serde_json::from_str::<Timing>("{}").unwrap(),
            Timing::default()
        );
    }
}
