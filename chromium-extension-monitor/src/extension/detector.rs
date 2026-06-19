use serde_json::Value;
use std::collections::HashMap;
use std::fs;
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

    /// 所属 Profile 名称
    pub profile: String,
}

/// 扩展检测器
#[derive(Debug)]
pub struct ExtensionDetector {
    /// Chromium 用户数据目录列表
    user_data_dirs: Vec<PathBuf>,

    /// 目标扩展 ID 列表
    target_extensions: Vec<String>,

    /// 扩展名称关键字列表
    extension_name_keywords: Vec<String>,

    /// 匹配模式
    match_mode: String,

    /// 要扫描的 Profile 列表
    profiles: Vec<String>,

    /// 未打包扩展的路径列表
    unpacked_extensions_paths: Vec<PathBuf>,

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
    pub fn new(
        user_data_dirs: Vec<PathBuf>,
        target_extensions: Vec<String>,
        extension_name_keywords: Vec<String>,
        match_mode: String,
        profiles: Vec<String>,
        unpacked_extensions_paths: Vec<PathBuf>,
    ) -> Self {
        Self {
            user_data_dirs,
            target_extensions,
            extension_name_keywords,
            match_mode,
            profiles,
            unpacked_extensions_paths,
            cache: HashMap::new(),
            cache_ttl: Duration::from_secs(5),
        }
    }

    /// 检测目标扩展是否已安装并启用
    pub fn detect(&mut self) -> crate::Result<DetectionResult> {
        info!("开始检测扩展安装和启用状态");

        let mut installed_extensions = Vec::new();
        let mut missing_extensions = Vec::new();
        let mut disabled_extensions = Vec::new();

        // 获取所有扩展
        let all_extensions = self.scan_all_dirs()?;

        // 检查目标扩展
        for target_id in &self.target_extensions {
            // 方法 1：精确匹配 ID
            let found_by_id = all_extensions.iter().find(|ext| {
                ext.id == *target_id || ext.id.to_lowercase() == target_id.to_lowercase()
            });

            // 方法 2：如果 ID 没找到，尝试通过名称关键字匹配（模糊模式）
            let found_by_name = if found_by_id.is_none()
                && (self.match_mode == "fuzzy" || self.match_mode == "mixed")
            {
                all_extensions.iter().find(|ext| {
                    self.extension_name_keywords
                        .iter()
                        .any(|keyword| ext.name.to_lowercase().contains(&keyword.to_lowercase()))
                })
            } else {
                None
            };

            // 合并结果
            let found_ext = found_by_id.or(found_by_name);

            if let Some(ext) = found_ext {
                if ext.enabled {
                    info!("检测到目标扩展已安装并启用：{} ({})", ext.name, ext.id);
                    installed_extensions.push(target_id.clone());
                } else {
                    warn!("检测到目标扩展已安装但未启用：{} ({})", ext.name, ext.id);
                    disabled_extensions.push(target_id.clone());
                }
            } else {
                warn!("目标扩展未安装：{}", target_id);
                missing_extensions.push(target_id.clone());
            }
        }

        // 如果使用模糊匹配，检查名称关键字
        if self.match_mode == "fuzzy" || self.match_mode == "mixed" {
            for keyword in &self.extension_name_keywords {
                let found = all_extensions
                    .iter()
                    .any(|ext| ext.name.to_lowercase().contains(&keyword.to_lowercase()));

                if found {
                    info!("通过名称关键字找到匹配扩展：{}", keyword);
                } else {
                    debug!("未找到匹配名称关键字 '{}' 的扩展", keyword);
                }
            }
        }

        Ok(DetectionResult {
            installed: installed_extensions,
            missing: missing_extensions,
            disabled: disabled_extensions,
            all_extensions,
            timestamp: Instant::now(),
        })
    }

    /// 扫描所有用户数据目录
    fn scan_all_dirs(&mut self) -> crate::Result<Vec<ExtensionInfo>> {
        let mut all_extensions = Vec::new();

        for user_data_dir in &self.user_data_dirs.clone() {
            if !user_data_dir.exists() {
                debug!("用户数据目录不存在：{:?}", user_data_dir);
                continue;
            }

            // 获取所有 Profile 目录
            let profile_dirs = self.get_profile_dirs(user_data_dir)?;

            for (profile_name, profile_dir) in profile_dirs {
                match self.scan_profile_directory(&profile_dir, &profile_name) {
                    Ok(extensions) => {
                        all_extensions.extend(extensions);
                    }
                    Err(e) => {
                        warn!("扫描 Profile {:?} 失败：{}", profile_dir, e);
                    }
                }
            }
        }

        // 扫描手动配置的未打包扩展路径
        all_extensions.extend(self.scan_configured_unpacked_extensions()?);

        info!("总共扫描到 {} 个扩展", all_extensions.len());
        Ok(all_extensions)
    }

    /// 获取所有 Profile 目录
    fn get_profile_dirs(&self, user_data_dir: &Path) -> crate::Result<Vec<(String, PathBuf)>> {
        let mut profile_dirs = Vec::new();

        // 如果配置指定了 profiles，只扫描指定的
        if !self.profiles.is_empty() {
            for profile_name in &self.profiles {
                let profile_dir = user_data_dir.join(profile_name);
                if profile_dir.exists() {
                    profile_dirs.push((profile_name.clone(), profile_dir));
                } else {
                    warn!("配置的 Profile 不存在：{}", profile_name);
                }
            }
        } else {
            // 扫描所有 Profile
            if let Ok(entries) = fs::read_dir(user_data_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        let dir_name = path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("")
                            .to_string();

                        // 检查是否是 Profile 目录（Default 或 Profile *）
                        if dir_name == "Default" || dir_name.starts_with("Profile ") {
                            profile_dirs.push((dir_name, path));
                        }
                    }
                }
            }
        }

        debug!("找到 {} 个 Profile 目录", profile_dirs.len());
        Ok(profile_dirs)
    }

    /// 扫描单个 Profile 目录
    fn scan_profile_directory(
        &mut self,
        profile_dir: &Path,
        profile_name: &str,
    ) -> crate::Result<Vec<ExtensionInfo>> {
        let extensions_dir = profile_dir.join("Extensions");

        // 读取扩展启用状态
        let enabled_status = self.read_extension_enabled_status(profile_dir)?;

        let mut extensions = Vec::new();

        // 方法 1：扫描 Extensions 目录
        if extensions_dir.exists() {
            if let Ok(entries) = fs::read_dir(&extensions_dir) {
                for entry in entries.flatten() {
                    let ext_dir = entry.path();

                    if !ext_dir.is_dir() {
                        continue;
                    }

                    // 扫描扩展目录下的所有版本
                    if let Ok(version_entries) = fs::read_dir(&ext_dir) {
                        for version_entry in version_entries.flatten() {
                            let version_dir = version_entry.path();

                            if version_dir.is_dir() {
                                if let Some(mut ext_info) =
                                    self.parse_extension(&version_dir, &ext_dir, profile_name)
                                {
                                    // 设置启用状态
                                    ext_info.enabled =
                                        enabled_status.get(&ext_info.id).copied().unwrap_or(false);

                                    // 更新缓存
                                    self.update_cache(ext_info.id.clone(), ext_info.clone());
                                    extensions.push(ext_info);
                                }
                            }
                        }
                    }
                }
            }
        }

        // 方法 2：从 Preferences 中读取未打包扩展
        extensions.extend(self.scan_unpacked_extensions(
            profile_dir,
            profile_name,
            &enabled_status,
        )?);

        debug!(
            "在 Profile {} 中找到 {} 个扩展（包含未打包）",
            profile_name,
            extensions.len()
        );
        Ok(extensions)
    }

    /// 扫描未打包的扩展（从 Preferences 文件）
    fn scan_unpacked_extensions(
        &self,
        profile_dir: &Path,
        profile_name: &str,
        enabled_status: &HashMap<String, bool>,
    ) -> crate::Result<Vec<ExtensionInfo>> {
        let mut extensions = Vec::new();

        let preferences_path = profile_dir.join("Preferences");
        if !preferences_path.exists() {
            return Ok(extensions);
        }

        // 复制文件以避免锁定
        let temp_preferences = profile_dir.join("Preferences.tmp");
        if let Err(_) = fs::copy(&preferences_path, &temp_preferences) {
            return Ok(extensions);
        }

        // 读取 Preferences
        if let Ok(content) = fs::read_to_string(&temp_preferences) {
            if let Ok(json) = content.parse::<Value>() {
                // 检查 extensions.settings 中的所有扩展
                if let Some(settings) = json
                    .get("extensions")
                    .and_then(|e| e.get("settings"))
                    .and_then(|s| s.as_object())
                {
                    for (ext_id, ext_data) in settings {
                        // 如果扩展不在 Extensions 目录中，可能是未打包扩展
                        let ext_enabled = ext_data
                            .get("state")
                            .and_then(|s| s.as_u64())
                            .map(|s| s == 1)
                            .unwrap_or(false);
                        let path = ext_data.get("path").and_then(|p| p.as_str());

                        if let Some(ext_path) = path {
                            let ext_path_obj = PathBuf::from(ext_path);
                            let manifest_path = ext_path_obj.join("manifest.json");

                            // 检查 manifest.json 是否存在
                            if manifest_path.exists() {
                                if let Some(mut ext_info) = self.parse_extension_from_manifest(
                                    &ext_path_obj,
                                    ext_id,
                                    profile_name,
                                ) {
                                    ext_info.enabled =
                                        enabled_status.get(ext_id).copied().unwrap_or(ext_enabled);
                                    extensions.push(ext_info.clone());
                                    info!("检测到未打包扩展：{} ({})", ext_info.name, ext_id);
                                }
                            }
                        }
                    }
                }
            }
        }

        // 清理临时文件
        let _ = fs::remove_file(&temp_preferences);

        Ok(extensions)
    }

    /// 扫描手动配置的未打包扩展路径
    fn scan_configured_unpacked_extensions(&self) -> crate::Result<Vec<ExtensionInfo>> {
        let mut extensions = Vec::new();

        for ext_path in &self.unpacked_extensions_paths {
            if !ext_path.exists() {
                warn!("配置的未打包扩展路径不存在：{:?}", ext_path);
                continue;
            }

            let manifest_path = ext_path.join("manifest.json");
            if !manifest_path.exists() {
                warn!("扩展路径中缺少 manifest.json: {:?}", ext_path);
                continue;
            }

            // 尝试从目录名获取扩展 ID（如果是 GUID 格式）
            let dir_ext_id = ext_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();

            if let Some(mut ext_info) =
                self.parse_extension_from_manifest(ext_path, &dir_ext_id, "Configured")
            {
                // 配置的未打包扩展默认启用
                ext_info.enabled = true;
                extensions.push(ext_info.clone());
                info!(
                    "检测到配置的未打包扩展：{} ({})",
                    ext_info.name, ext_info.id
                );
            }
        }

        Ok(extensions)
    }

    /// 读取扩展启用状态
    fn read_extension_enabled_status(
        &self,
        profile_dir: &Path,
    ) -> crate::Result<HashMap<String, bool>> {
        let mut enabled_status = HashMap::new();

        // 尝试读取 Preferences 文件
        let preferences_path = profile_dir.join("Preferences");
        if !preferences_path.exists() {
            debug!("Preferences 文件不存在：{:?}", preferences_path);
            return Ok(enabled_status);
        }

        // 复制文件以避免锁定问题
        let temp_preferences = profile_dir.join("Preferences.tmp");
        if let Err(e) = fs::copy(&preferences_path, &temp_preferences) {
            debug!("复制 Preferences 文件失败：{}", e);
            return Ok(enabled_status);
        }

        // 读取并解析 JSON
        if let Ok(content) = fs::read_to_string(&temp_preferences) {
            if let Ok(json) = content.parse::<Value>() {
                // 从 extensions.settings 读取已安装扩展的启用状态
                if let Some(extensions) = json.get("extensions").and_then(|e| e.get("settings")) {
                    if let Some(settings) = extensions.as_object() {
                        for (ext_id, ext_data) in settings {
                            if let Some(state) = ext_data.get("state").and_then(|s| s.as_u64()) {
                                // state: 1 = 启用，0 = 禁用
                                enabled_status.insert(ext_id.clone(), state == 1);
                                debug!(
                                    "扩展 {} 启用状态：{}",
                                    ext_id,
                                    if state == 1 { "启用" } else { "禁用" }
                                );
                            }
                        }
                    }
                }

                // 从未打包扩展目录读取 (User Data\Default\Extensions 下没有，但在 Preferences 中有记录)
                // 检查 chrome_settings_overrides 或其他配置
                if let Some(installed_extensions) = json.get("installed_extensions") {
                    if let Some(extensions) = installed_extensions.as_object() {
                        for (ext_id, _ext_data) in extensions {
                            if !enabled_status.contains_key(ext_id) {
                                // 如果扩展在 installed_extensions 中但不在 extensions.settings 中，默认启用
                                enabled_status.insert(ext_id.clone(), true);
                                debug!("未打包扩展 {} 状态：启用", ext_id);
                            }
                        }
                    }
                }
            }
        }

        // 清理临时文件
        let _ = fs::remove_file(&temp_preferences);

        debug!("读取到 {} 个扩展的启用状态", enabled_status.len());
        Ok(enabled_status)
    }

    /// 解析扩展信息
    fn parse_extension(
        &self,
        version_dir: &Path,
        ext_dir: &Path,
        profile_name: &str,
    ) -> Option<ExtensionInfo> {
        let manifest_path = version_dir.join("manifest.json");

        if !manifest_path.exists() {
            return None;
        }

        // 读取 manifest.json
        let manifest_content = fs::read_to_string(&manifest_path).ok()?;
        let manifest: Value = serde_json::from_str(&manifest_content).ok()?;

        // 提取扩展 ID（从目录名）
        let ext_id = ext_dir.file_name()?.to_str()?.to_string();

        // 提取名称和版本
        let name = manifest["name"]
            .as_str()
            .unwrap_or("Unknown Extension")
            .to_string();

        let version = manifest["version"].as_str().unwrap_or("0.0.0").to_string();

        Some(ExtensionInfo {
            id: ext_id,
            name,
            version,
            path: version_dir.to_path_buf(),
            enabled: false, // 稍后会根据 Preferences 设置
            profile: profile_name.to_string(),
        })
    }

    /// 从 manifest.json 解析扩展信息（用于未打包扩展）
    fn parse_extension_from_manifest(
        &self,
        ext_dir: &Path,
        ext_id: &str,
        profile_name: &str,
    ) -> Option<ExtensionInfo> {
        let manifest_path = ext_dir.join("manifest.json");

        if !manifest_path.exists() {
            return None;
        }

        // 读取 manifest.json
        let manifest_content = fs::read_to_string(&manifest_path).ok()?;
        let manifest: Value = serde_json::from_str(&manifest_content).ok()?;

        // 提取名称和版本
        let name = manifest["name"]
            .as_str()
            .unwrap_or("Unknown Extension")
            .to_string();

        let version = manifest["version"].as_str().unwrap_or("0.0.0").to_string();

        Some(ExtensionInfo {
            id: ext_id.to_string(),
            name,
            version,
            path: ext_dir.to_path_buf(),
            enabled: false,
            profile: profile_name.to_string(),
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
        self.cache
            .retain(|_, entry| now.duration_since(entry.timestamp) < self.cache_ttl);
    }

    /// 设置缓存 TTL
    pub fn set_cache_ttl(&mut self, ttl: Duration) {
        self.cache_ttl = ttl;
    }
}

/// 检测结果
#[derive(Debug)]
pub struct DetectionResult {
    /// 已安装并启用的目标扩展 ID 列表
    pub installed: Vec<String>,

    /// 未安装的目标扩展 ID 列表
    pub missing: Vec<String>,

    /// 已安装但未启用的目标扩展 ID 列表
    pub disabled: Vec<String>,

    /// 所有检测到的扩展
    pub all_extensions: Vec<ExtensionInfo>,

    /// 检测时间戳
    pub timestamp: Instant,
}

impl DetectionResult {
    /// 检查是否所有目标扩展都已安装并启用
    pub fn all_installed(&self) -> bool {
        self.missing.is_empty() && self.disabled.is_empty()
    }

    /// 检查是否有目标扩展缺失
    pub fn has_missing(&self) -> bool {
        !self.missing.is_empty()
    }

    /// 检查是否有目标扩展被禁用
    pub fn has_disabled(&self) -> bool {
        !self.disabled.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use assert_fs::prelude::*;
    use assert_fs::TempDir;

    fn create_mock_extension(dir: &Path, ext_id: &str, name: &str, version: &str) {
        let ext_dir = dir.join("Default").join("Extensions").join(ext_id);
        let version_dir = ext_dir.join(version);
        fs::create_dir_all(&version_dir).unwrap();

        let manifest = format!(r#"{{"name": "{}", "version": "{}"}}"#, name, version);
        fs::write(version_dir.join("manifest.json"), &manifest).unwrap();
    }

    fn create_mock_preferences(dir: &Path, ext_id: &str, enabled: bool) {
        let preferences = format!(
            r#"{{
                "extensions": {{
                    "settings": {{
                        "{}": {{
                            "state": {}
                        }}
                    }}
                }}
            }}"#,
            ext_id,
            if enabled { 1 } else { 0 }
        );
        fs::write(dir.join("Default").join("Preferences"), &preferences).unwrap();
    }

    #[test]
    fn test_extension_detector_creation() {
        let detector = ExtensionDetector::new(
            vec![],
            vec!["test-ext".to_string()],
            vec![],
            "mixed".to_string(),
            vec![],
        );
        assert!(detector.target_extensions.contains(&"test-ext".to_string()));
    }

    #[test]
    fn test_extension_detector_scan() {
        let temp_dir = TempDir::new().unwrap();
        create_mock_extension(temp_dir.path(), "ext-123", "Test Extension", "1.0.0");
        create_mock_preferences(temp_dir.path(), "ext-123", true);

        let mut detector = ExtensionDetector::new(
            vec![temp_dir.path().to_path_buf()],
            vec!["ext-123".to_string()],
            vec![],
            "mixed".to_string(),
            vec![],
        );

        let result = detector.detect().unwrap();
        assert!(result.all_installed());
        assert_eq!(result.installed.len(), 1);
        assert_eq!(result.missing.len(), 0);
        assert_eq!(result.disabled.len(), 0);
    }

    #[test]
    fn test_extension_detector_disabled() {
        let temp_dir = TempDir::new().unwrap();
        create_mock_extension(temp_dir.path(), "ext-123", "Test Extension", "1.0.0");
        create_mock_preferences(temp_dir.path(), "ext-123", false);

        let mut detector = ExtensionDetector::new(
            vec![temp_dir.path().to_path_buf()],
            vec!["ext-123".to_string()],
            vec![],
            "mixed".to_string(),
            vec![],
        );

        let result = detector.detect().unwrap();
        assert!(!result.all_installed());
        assert_eq!(result.installed.len(), 0);
        assert_eq!(result.missing.len(), 0);
        assert_eq!(result.disabled.len(), 1);
    }
}
