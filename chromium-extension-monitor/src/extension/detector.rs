use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tracing::{debug, info, warn};

/// 扩展信息
#[derive(Debug, Clone)]
pub struct ExtensionInfo {
    /// 扩展 ID
    pub id: String,

    /// 扩展名称
    pub name: String,

    /// 扩展版本
    pub version: String,

    /// 扩展路径
    pub path: PathBuf,

    /// 是否启用
    pub enabled: bool,
}

/// 扩展检测器
#[derive(Debug)]
pub struct ExtensionDetector {
    /// Chromium 用户数据目录列表
    user_data_dirs: Vec<PathBuf>,

    /// 目标扩展 ID 列表
    target_extensions: Vec<String>,

    /// 扩展缓存
    cache: HashMap<String, ExtensionCacheEntry>,

    /// 缓存有效期
    cache_ttl: Duration,
}

#[derive(Debug, Clone)]
struct ExtensionCacheEntry {
    info: ExtensionInfo,
    timestamp: Instant,
}

impl ExtensionDetector {
    /// 创建新的扩展检测器
    pub fn new(user_data_dirs: Vec<PathBuf>, target_extensions: Vec<String>) -> Self {
        Self {
            user_data_dirs,
            target_extensions,
            cache: HashMap::new(),
            cache_ttl: Duration::from_secs(5),
        }
    }

    /// 检测目标扩展是否已安装
    pub fn detect(&mut self) -> crate::Result<DetectionResult> {
        info!("开始检测扩展安装状态");

        let mut installed_extensions = Vec::new();
        let mut missing_extensions = Vec::new();

        // 获取所有扩展
        let all_extensions = self.scan_all_dirs()?;

        // 检查目标扩展
        for target_id in &self.target_extensions {
            let found = all_extensions.iter().any(|ext| {
                ext.id == *target_id || ext.id.to_lowercase() == target_id.to_lowercase()
            });

            if found {
                info!("检测到目标扩展已安装：{}", target_id);
                installed_extensions.push(target_id.clone());
            } else {
                warn!("目标扩展未安装：{}", target_id);
                missing_extensions.push(target_id.clone());
            }
        }

        Ok(DetectionResult {
            installed: installed_extensions,
            missing: missing_extensions,
            all_extensions,
            timestamp: Instant::now(),
        })
    }

    /// 扫描所有用户数据目录
    fn scan_all_dirs(&mut self) -> crate::Result<Vec<ExtensionInfo>> {
        let mut all_extensions = Vec::new();

        for dir in &self.user_data_dirs.clone() {
            if !dir.exists() {
                debug!("用户数据目录不存在：{:?}", dir);
                continue;
            }

            match self.scan_directory(&dir) {
                Ok(extensions) => {
                    all_extensions.extend(extensions);
                }
                Err(e) => {
                    warn!("扫描目录 {:?} 失败：{}", dir, e);
                }
            }
        }

        Ok(all_extensions)
    }

    /// 扫描单个用户数据目录
    fn scan_directory(&mut self, user_data_dir: &Path) -> crate::Result<Vec<ExtensionInfo>> {
        let extensions_dir = user_data_dir.join("Extensions");

        if !extensions_dir.exists() {
            return Err(crate::error::ExtensionError::DirectoryNotFound(
                extensions_dir.display().to_string(),
            )
            .into());
        }

        let mut extensions = Vec::new();

        // 读取 Extensions 目录
        let entries = std::fs::read_dir(&extensions_dir).map_err(|e| {
            crate::error::ExtensionError::DirectoryNotFound(format!(
                "无法读取扩展目录：{}",
                e
            ))
        })?;

        for entry in entries.flatten() {
            let ext_dir = entry.path();

            if !ext_dir.is_dir() {
                continue;
            }

            // 扫描扩展目录下的所有版本
            if let Ok(version_entries) = std::fs::read_dir(&ext_dir) {
                for version_entry in version_entries.flatten() {
                    let version_dir = version_entry.path();

                    if version_dir.is_dir() {
                        if let Some(ext_info) = self.parse_extension(&version_dir, &ext_dir) {
                            // 更新缓存
                            self.update_cache(ext_info.id.clone(), ext_info.clone());
                            extensions.push(ext_info);
                        }
                    }
                }
            }
        }

        debug!("在 {:?} 中找到 {} 个扩展", extensions_dir, extensions.len());
        Ok(extensions)
    }

    /// 解析扩展信息
    fn parse_extension(&self, version_dir: &Path, ext_dir: &Path) -> Option<ExtensionInfo> {
        let manifest_path = version_dir.join("manifest.json");

        if !manifest_path.exists() {
            return None;
        }

        // 读取 manifest.json
        let manifest_content = std::fs::read_to_string(&manifest_path).ok()?;
        let manifest: serde_json::Value = serde_json::from_str(&manifest_content).ok()?;

        // 提取扩展 ID（从目录名）
        let ext_id = ext_dir.file_name()?.to_str()?.to_string();

        // 提取名称和版本
        let name = manifest["name"]
            .as_str()
            .unwrap_or("Unknown Extension")
            .to_string();

        let version = manifest["version"]
            .as_str()
            .unwrap_or("0.0.0")
            .to_string();

        // 检查是否启用（简化处理，默认启用）
        let enabled = true;

        Some(ExtensionInfo {
            id: ext_id,
            name,
            version,
            path: version_dir.to_path_buf(),
            enabled,
        })
    }

    /// 更新缓存
    fn update_cache(&mut self, ext_id: String, info: ExtensionInfo) {
        self.cache.insert(
            ext_id,
            ExtensionCacheEntry {
                info,
                timestamp: Instant::now(),
            },
        );
    }

    /// 从缓存获取扩展信息
    pub fn get_from_cache(&self, ext_id: &str) -> Option<&ExtensionInfo> {
        self.cache.get(ext_id).and_then(|entry| {
            if entry.timestamp.elapsed() < self.cache_ttl {
                Some(&entry.info)
            } else {
                None
            }
        })
    }

    /// 清除过期缓存
    pub fn cleanup_cache(&mut self) {
        let now = Instant::now();
        self.cache.retain(|_, entry| now.duration_since(entry.timestamp) < self.cache_ttl);
    }

    /// 设置缓存 TTL
    pub fn set_cache_ttl(&mut self, ttl: Duration) {
        self.cache_ttl = ttl;
    }
}

/// 检测结果
#[derive(Debug)]
pub struct DetectionResult {
    /// 已安装的目标扩展 ID 列表
    pub installed: Vec<String>,

    /// 未安装的目标扩展 ID 列表
    pub missing: Vec<String>,

    /// 所有检测到的扩展
    pub all_extensions: Vec<ExtensionInfo>,

    /// 检测时间戳
    pub timestamp: Instant,
}

impl DetectionResult {
    /// 检查是否所有目标扩展都已安装
    pub fn all_installed(&self) -> bool {
        self.missing.is_empty()
    }

    /// 检查是否有目标扩展缺失
    pub fn has_missing(&self) -> bool {
        !self.missing.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use assert_fs::prelude::*;
    use assert_fs::TempDir;

    fn create_mock_extension(dir: &Path, ext_id: &str, name: &str, version: &str) {
        use std::fs;
        let ext_dir = dir.join("Extensions").join(ext_id);
        let version_dir = ext_dir.join(version);
        fs::create_dir_all(&version_dir).unwrap();

        let manifest = format!(
            r#"{{"name": "{}", "version": "{}"}}"#,
            name, version
        );
        fs::write(version_dir.join("manifest.json"), &manifest).unwrap();
    }

    #[test]
    fn test_extension_detector_creation() {
        let detector = ExtensionDetector::new(vec![], vec!["test-ext".to_string()]);
        assert!(detector.target_extensions.contains(&"test-ext".to_string()));
    }

    #[test]
    fn test_extension_detector_scan() {
        let temp_dir = TempDir::new().unwrap();
        create_mock_extension(temp_dir.path(), "ext-123", "Test Extension", "1.0.0");

        let mut detector = ExtensionDetector::new(
            vec![temp_dir.path().to_path_buf()],
            vec!["ext-123".to_string()],
        );

        let result = detector.detect().unwrap();
        assert!(result.all_installed());
        assert_eq!(result.installed.len(), 1);
        assert_eq!(result.missing.len(), 0);
    }

    #[test]
    fn test_extension_detector_missing() {
        let temp_dir = TempDir::new().unwrap();
        create_mock_extension(temp_dir.path(), "ext-456", "Other Extension", "1.0.0");

        let mut detector = ExtensionDetector::new(
            vec![temp_dir.path().to_path_buf()],
            vec!["ext-123".to_string()],
        );

        let result = detector.detect().unwrap();
        assert!(!result.all_installed());
        assert!(result.has_missing());
        assert_eq!(result.missing.len(), 1);
    }

    #[test]
    fn test_cache_update() {
        let mut detector = ExtensionDetector::new(vec![], vec![]);
        let info = ExtensionInfo {
            id: "test-ext".to_string(),
            name: "Test".to_string(),
            version: "1.0".to_string(),
            path: PathBuf::from("/test"),
            enabled: true,
        };

        detector.update_cache("test-ext".to_string(), info.clone());
        let cached = detector.get_from_cache("test-ext");
        assert!(cached.is_some());
        assert_eq!(cached.unwrap().name, "Test");
    }
}
