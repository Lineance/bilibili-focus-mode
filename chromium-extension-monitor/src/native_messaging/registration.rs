use serde_json::json;
use std::fs;
use std::path::Path;
use tracing::info;

/// Native Messaging host name
const HOST_NAME: &str = "com.bilibili.focus.monitor";

/// Generate host manifest JSON
pub fn generate_host_manifest(extension_id: &str, exe_path: &Path) -> serde_json::Value {
    json!({
        "name": HOST_NAME,
        "description": "Bilibili Focus Mode native messaging host",
        "path": exe_path.to_string_lossy(),
        "type": "stdio",
        "allowed_origins": [format!("chrome-extension://{}/", extension_id)]
    })
}

/// Install native messaging host
pub fn install_native_host(extension_id: &str) -> crate::Result<()> {
    let exe_path = std::env::current_exe().map_err(|e| {
        crate::AppError::other(format!("Failed to get current executable path: {}", e))
    })?;

    info!("Installing native messaging host: {}", HOST_NAME);
    info!("Extension ID: {}", extension_id);
    info!("Executable path: {:?}", exe_path);

    // Generate manifest
    let manifest = generate_host_manifest(extension_id, &exe_path);

    // Write manifest file next to executable
    let manifest_path = exe_path
        .parent()
        .ok_or_else(|| crate::AppError::other("Failed to get executable directory"))?
        .join(format!("{}.json", HOST_NAME));

    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| crate::AppError::other(format!("Failed to serialize manifest: {}", e)))?;

    fs::write(&manifest_path, manifest_json)
        .map_err(|e| crate::AppError::other(format!("Failed to write host manifest: {}", e)))?;

    info!("Host manifest written to: {:?}", manifest_path);

    // Register in Windows registry
    #[cfg(windows)]
    {
        register_windows_registry(&manifest_path)?;
    }

    // Register in Linux/macOS
    #[cfg(not(windows))]
    {
        register_unix_manifest(&manifest_path)?;
    }

    info!("Native messaging host installed successfully");
    Ok(())
}

/// Uninstall native messaging host
pub fn uninstall_native_host() -> crate::Result<()> {
    info!("Uninstalling native messaging host: {}", HOST_NAME);

    // Remove manifest file
    let exe_path = std::env::current_exe().map_err(|e| {
        crate::AppError::other(format!("Failed to get current executable path: {}", e))
    })?;

    let manifest_path = exe_path
        .parent()
        .ok_or_else(|| crate::AppError::other("Failed to get executable directory"))?
        .join(format!("{}.json", HOST_NAME));

    if manifest_path.exists() {
        fs::remove_file(&manifest_path).map_err(|e| {
            crate::AppError::other(format!("Failed to remove host manifest: {}", e))
        })?;
        info!("Removed manifest: {:?}", manifest_path);
    }

    // Remove from Windows registry
    #[cfg(windows)]
    {
        unregister_windows_registry()?;
    }

    info!("Native messaging host uninstalled successfully");
    Ok(())
}

/// Register native messaging host in Windows registry
#[cfg(windows)]
fn register_windows_registry(manifest_path: &Path) -> crate::Result<()> {
    info!("Registering in Windows registry...");

    // Registry paths for Chrome and Chromium
    let registry_paths = [
        r"SOFTWARE\Google\Chrome\NativeMessagingHosts",
        r"SOFTWARE\Chromium\NativeMessagingHosts",
    ];

    let manifest_path_str = manifest_path.to_string_lossy().to_string();

    for registry_path in &registry_paths {
        // Use reg command as a fallback since windows crate feature is not enabled
        let output = std::process::Command::new("reg")
            .args([
                "add",
                &format!("HKCU\\{}", registry_path),
                "/v",
                HOST_NAME,
                "/t",
                "REG_SZ",
                "/d",
                &manifest_path_str,
                "/f",
            ])
            .output();

        match output {
            Ok(result) if result.status.success() => {
                info!("Registered in: {}", registry_path);
            }
            Ok(result) => {
                info!(
                    "Failed to register in {}: {}",
                    registry_path,
                    String::from_utf8_lossy(&result.stderr)
                );
            }
            Err(e) => {
                info!("Failed to run reg command: {}", e);
            }
        }
    }

    Ok(())
}

/// Remove native messaging host from Windows registry
#[cfg(windows)]
fn unregister_windows_registry() -> crate::Result<()> {
    info!("Removing from Windows registry...");

    let registry_paths = [
        r"SOFTWARE\Google\Chrome\NativeMessagingHosts",
        r"SOFTWARE\Chromium\NativeMessagingHosts",
    ];

    for registry_path in &registry_paths {
        let output = std::process::Command::new("reg")
            .args([
                "delete",
                &format!("HKCU\\{}\\{}", registry_path, HOST_NAME),
                "/f",
            ])
            .output();

        match output {
            Ok(result) if result.status.success() => {
                info!("Removed from: {}", registry_path);
            }
            _ => {
                info!("Failed to remove from: {} (may not exist)", registry_path);
            }
        }
    }

    Ok(())
}

/// Register native messaging host on Linux/macOS
#[cfg(not(windows))]
fn register_unix_manifest(manifest_path: &Path) -> crate::Result<()> {
    let home =
        dirs::home_dir().ok_or_else(|| crate::AppError::other("Failed to get home directory"))?;

    #[cfg(target_os = "linux")]
    let native_hosts_dir = home.join(".config/google-chrome/NativeMessagingHosts");

    #[cfg(target_os = "macos")]
    let native_hosts_dir =
        home.join("Library/Application Support/Google/Chrome/NativeMessagingHosts");

    fs::create_dir_all(&native_hosts_dir).map_err(|e| {
        crate::AppError::other(format!(
            "Failed to create NativeMessagingHosts directory: {}",
            e
        ))
    })?;

    let dest_path = native_hosts_dir.join(format!("{}.json", HOST_NAME));
    fs::copy(manifest_path, &dest_path).map_err(|e| {
        crate::AppError::other(format!(
            "Failed to copy manifest to NativeMessagingHosts directory: {}",
            e
        ))
    })?;

    info!("Manifest copied to: {:?}", dest_path);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_host_manifest() {
        let exe_path = Path::new(r"C:\path\to\chromium-extension-monitor.exe");
        let manifest = generate_host_manifest("abcdefghijklmnopqrstuvwx", exe_path);

        assert_eq!(manifest.get("name").unwrap(), HOST_NAME);
        assert_eq!(manifest.get("type").unwrap(), "stdio");
        assert!(manifest
            .get("allowed_origins")
            .unwrap()
            .as_array()
            .unwrap()
            .contains(&json!("chrome-extension://abcdefghijklmnopqrstuvwx/")));
    }
}
