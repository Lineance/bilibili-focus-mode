use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
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

    fs::write(&manifest_path, serde_json::to_string_pretty(&manifest)?)
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
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegCreateKeyExW, RegSetValueExW, HKEY_CURRENT_USER, KEY_WRITE,
        REG_OPTION_NON_VOLATILE, REG_SZ,
    };

    info!("Registering in Windows registry...");

    // Registry paths for Chrome and Chromium
    let registry_paths = [
        r"SOFTWARE\Google\Chrome\NativeMessagingHosts",
        r"SOFTWARE\Chromium\NativeMessagingHosts",
    ];

    for registry_path in &registry_paths {
        let key_path_wide: Vec<u16> = registry_path
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        let host_name_wide: Vec<u16> = HOST_NAME.encode_utf16().chain(std::iter::once(0)).collect();

        let manifest_path_wide: Vec<u16> = manifest_path
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        unsafe {
            let mut hkey = Default::default();
            let result = RegCreateKeyExW(
                HKEY_CURRENT_USER,
                PCWSTR(key_path_wide.as_ptr()),
                0,
                None,
                REG_OPTION_NON_VOLATILE,
                KEY_WRITE,
                None,
                &mut hkey,
                None,
            );

            if result.is_ok() {
                let _ = RegSetValueExW(
                    hkey,
                    PCWSTR(host_name_wide.as_ptr()),
                    0,
                    REG_SZ,
                    Some(manifest_path_wide.as_bytes()),
                );
                let _ = RegCloseKey(hkey);
                info!("Registered in: {}", registry_path);
            } else {
                info!("Failed to register in: {}", registry_path);
            }
        }
    }

    Ok(())
}

/// Remove native messaging host from Windows registry
#[cfg(windows)]
fn unregister_windows_registry() -> crate::Result<()> {
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegDeleteTreeW, RegOpenKeyExW, HKEY_CURRENT_USER, KEY_WRITE,
    };

    info!("Removing from Windows registry...");

    let registry_paths = [
        r"SOFTWARE\Google\Chrome\NativeMessagingHosts",
        r"SOFTWARE\Chromium\NativeMessagingHosts",
    ];

    for registry_path in &registry_paths {
        let key_path_wide: Vec<u16> = registry_path
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        let host_name_wide: Vec<u16> = HOST_NAME.encode_utf16().chain(std::iter::once(0)).collect();

        unsafe {
            let mut hkey = Default::default();
            let result = RegOpenKeyExW(
                HKEY_CURRENT_USER,
                PCWSTR(key_path_wide.as_ptr()),
                0,
                KEY_WRITE,
                &mut hkey,
            );

            if result.is_ok() {
                let _ = RegDeleteTreeW(hkey, PCWSTR(host_name_wide.as_ptr()));
                let _ = windows::Win32::System::Registry::RegCloseKey(hkey);
                info!("Removed from: {}", registry_path);
            }
        }
    }

    Ok(())
}

/// Register native messaging host on Linux/macOS
#[cfg(not(windows))]
fn register_unix_manifest(manifest_path: &Path) -> crate::Result<()> {
    // On Linux, copy to ~/.config/google-chrome/NativeMessagingHosts/
    // On macOS, copy to ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/

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

/// Install native messaging host
pub fn install_native_host(extension_id: &str) -> Result<()> {
    let exe_path = std::env::current_exe().context("Failed to get current executable path")?;

    info!("Installing native messaging host: {}", HOST_NAME);
    info!("Extension ID: {}", extension_id);
    info!("Executable path: {:?}", exe_path);

    // Generate manifest
    let manifest = generate_host_manifest(extension_id, &exe_path);

    // Write manifest file next to executable
    let manifest_path = exe_path
        .parent()
        .context("Failed to get executable directory")?
        .join(format!("{}.json", HOST_NAME));

    fs::write(&manifest_path, serde_json::to_string_pretty(&manifest)?)
        .context("Failed to write host manifest")?;

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
pub fn uninstall_native_host() -> Result<()> {
    info!("Uninstalling native messaging host: {}", HOST_NAME);

    // Remove manifest file
    let exe_path = std::env::current_exe().context("Failed to get current executable path")?;

    let manifest_path = exe_path
        .parent()
        .context("Failed to get executable directory")?
        .join(format!("{}.json", HOST_NAME));

    if manifest_path.exists() {
        fs::remove_file(&manifest_path).context("Failed to remove host manifest")?;
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
fn register_windows_registry(manifest_path: &Path) -> Result<()> {
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegCreateKeyExW, RegSetValueExW, HKEY_CURRENT_USER, KEY_WRITE,
        REG_OPTION_NON_VOLATILE, REG_SZ,
    };

    info!("Registering in Windows registry...");

    // Registry paths for Chrome and Chromium
    let registry_paths = [
        r"SOFTWARE\Google\Chrome\NativeMessagingHosts",
        r"SOFTWARE\Chromium\NativeMessagingHosts",
    ];

    for registry_path in &registry_paths {
        let key_path_wide: Vec<u16> = registry_path
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        let host_name_wide: Vec<u16> = HOST_NAME.encode_utf16().chain(std::iter::once(0)).collect();

        let manifest_path_wide: Vec<u16> = manifest_path
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        unsafe {
            let mut hkey = Default::default();
            let result = RegCreateKeyExW(
                HKEY_CURRENT_USER,
                PCWSTR(key_path_wide.as_ptr()),
                0,
                None,
                REG_OPTION_NON_VOLATILE,
                KEY_WRITE,
                None,
                &mut hkey,
                None,
            );

            if result.is_ok() {
                let _ = RegSetValueExW(
                    hkey,
                    PCWSTR(host_name_wide.as_ptr()),
                    0,
                    REG_SZ,
                    Some(manifest_path_wide.as_bytes()),
                );
                let _ = RegCloseKey(hkey);
                info!("Registered in: {}", registry_path);
            } else {
                info!("Failed to register in: {}", registry_path);
            }
        }
    }

    Ok(())
}

/// Remove native messaging host from Windows registry
#[cfg(windows)]
fn unregister_windows_registry() -> Result<()> {
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegDeleteTreeW, RegOpenKeyExW, HKEY_CURRENT_USER, KEY_WRITE,
    };

    info!("Removing from Windows registry...");

    let registry_paths = [
        r"SOFTWARE\Google\Chrome\NativeMessagingHosts",
        r"SOFTWARE\Chromium\NativeMessagingHosts",
    ];

    for registry_path in &registry_paths {
        let key_path_wide: Vec<u16> = registry_path
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        let host_name_wide: Vec<u16> = HOST_NAME.encode_utf16().chain(std::iter::once(0)).collect();

        unsafe {
            let mut hkey = Default::default();
            let result = RegOpenKeyExW(
                HKEY_CURRENT_USER,
                PCWSTR(key_path_wide.as_ptr()),
                0,
                KEY_WRITE,
                &mut hkey,
            );

            if result.is_ok() {
                let _ = RegDeleteTreeW(hkey, PCWSTR(host_name_wide.as_ptr()));
                let _ = windows::Win32::System::Registry::RegCloseKey(hkey);
                info!("Removed from: {}", registry_path);
            }
        }
    }

    Ok(())
}

/// Register native messaging host on Linux/macOS
#[cfg(not(windows))]
fn register_unix_manifest(manifest_path: &Path) -> Result<()> {
    // On Linux, copy to ~/.config/google-chrome/NativeMessagingHosts/
    // On macOS, copy to ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/

    let home = dirs::home_dir().context("Failed to get home directory")?;

    #[cfg(target_os = "linux")]
    let native_hosts_dir = home.join(".config/google-chrome/NativeMessagingHosts");

    #[cfg(target_os = "macos")]
    let native_hosts_dir =
        home.join("Library/Application Support/Google/Chrome/NativeMessagingHosts");

    fs::create_dir_all(&native_hosts_dir)
        .context("Failed to create NativeMessagingHosts directory")?;

    let dest_path = native_hosts_dir.join(format!("{}.json", HOST_NAME));
    fs::copy(manifest_path, &dest_path)
        .context("Failed to copy manifest to NativeMessagingHosts directory")?;

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
