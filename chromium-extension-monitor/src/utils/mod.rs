pub mod logger;

use std::path::{Path, PathBuf};

/// 获取应用程序目录
pub fn get_app_dir() -> crate::Result<PathBuf> {
    std::env::current_dir()
        .map_err(|e| crate::error::AppError::other(format!("获取应用程序目录失败：{}", e)))
}

/// 获取配置文件路径
pub fn get_config_path(custom_path: Option<&Path>) -> PathBuf {
    if let Some(path) = custom_path {
        path.to_path_buf()
    } else {
        get_app_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("config.toml")
    }
}

/// 获取日志文件路径
pub fn get_log_path(log_file: &str) -> PathBuf {
    get_app_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(log_file)
}

/// 检查是否以管理员权限运行（Windows）
#[cfg(windows)]
pub fn is_admin() -> bool {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::Security::{GetTokenInformation, TOKEN_ELEVATION, TOKEN_QUERY};
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token_handle: HANDLE = HANDLE::default();
        let process = GetCurrentProcess();

        if OpenProcessToken(process, TOKEN_QUERY, &mut token_handle).is_err() {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION::default();
        let mut size = 0u32;

        let result = GetTokenInformation(
            token_handle,
            windows::Win32::Security::TokenElevation,
            Some(&mut elevation as *mut _ as *mut _),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut size,
        );

        let _ = CloseHandle(token_handle);

        if result.is_ok() {
            elevation.TokenIsElevated != 0
        } else {
            false
        }
    }
}

/// 隐藏控制台窗口（Windows）
#[cfg(windows)]
pub fn hide_console() {
    use windows::Win32::System::Console::GetConsoleWindow;
    use windows::Win32::UI::WindowsAndMessaging::ShowWindow;
    use windows::Win32::UI::WindowsAndMessaging::SW_HIDE;

    unsafe {
        let hwnd = GetConsoleWindow();
        if !hwnd.is_invalid() {
            let _ = ShowWindow(hwnd, SW_HIDE);
        }
    }
}

/// 检查是否以管理员权限运行（非 Windows）
#[cfg(not(windows))]
pub fn is_admin() -> bool {
    // 简单检查 UID
    unsafe { libc::geteuid() == 0 }
}

/// 请求管理员权限（Windows）
#[cfg(windows)]
pub fn request_admin() -> crate::Result<()> {
    use std::env::current_exe;
    use std::process::Command;

    let exe = current_exe()?;
    let args: Vec<String> = std::env::args().skip(1).collect();

    // 直接使用 PowerShell Start-Process
    let mut ps_cmd = Command::new("powershell");
    ps_cmd.arg("-NoProfile");
    ps_cmd.arg("-ExecutionPolicy");
    ps_cmd.arg("Bypass");
    ps_cmd.arg("-WindowStyle");
    ps_cmd.arg("Hidden");
    ps_cmd.arg("-Command");

    // 构建 Start-Process 命令
    let mut start_cmd = format!(
        "Start-Process -FilePath '{}' -Verb RunAs -PassThru",
        exe.display()
    );

    if !args.is_empty() {
        let args_str = args
            .iter()
            .map(|arg| format!("'{}'", arg.replace("'", "''")))
            .collect::<Vec<_>>()
            .join(",");
        start_cmd.push_str(&format!(" -ArgumentList @({})", args_str));
    }

    ps_cmd.arg(&start_cmd);

    // 执行并等待完成
    let status = ps_cmd.status()?;

    if !status.success() {
        return Err(crate::error::AppError::other(format!(
            "请求管理员权限失败，退出码：{}",
            status.code().unwrap_or(-1)
        )));
    }

    // 退出当前非特权实例
    std::process::exit(0);
}

/// 请求管理员权限（非 Windows）
#[cfg(not(windows))]
pub fn request_admin() -> crate::Result<()> {
    Err(crate::error::AppError::other("此平台不支持请求管理员权限"))
}

/// 获取默认 Chromium 用户数据目录
pub fn get_default_chromium_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if let Some(_home_dir) = dirs::home_dir() {
        // Windows
        #[cfg(windows)]
        {
            if let Some(local_app_data) = dirs::data_local_dir() {
                dirs.push(local_app_data.join("Chromium\\User Data"));
                dirs.push(local_app_data.join("Google\\Chrome\\User Data"));
                dirs.push(local_app_data.join("Microsoft\\Edge\\User Data"));
            }
        }

        // macOS
        #[cfg(target_os = "macos")]
        {
            dirs.push(home_dir.join("Library/Application Support/Chromium"));
            dirs.push(home_dir.join("Library/Application Support/Google/Chrome"));
            dirs.push(home_dir.join("Library/Application Support/Microsoft/Edge"));
        }

        // Linux
        #[cfg(target_os = "linux")]
        {
            dirs.push(home_dir.join(".config/chromium"));
            dirs.push(home_dir.join(".config/google-chrome"));
            dirs.push(home_dir.join(".config/microsoft-edge"));
        }
    }

    dirs
}

/// 格式化持续时间
pub fn format_duration(duration: std::time::Duration) -> String {
    let total_secs = duration.as_secs();
    let days = total_secs / 86400;
    let hours = (total_secs % 86400) / 3600;
    let mins = (total_secs % 3600) / 60;
    let secs = total_secs % 60;

    if days > 0 {
        format!("{}d {}h {}m {}s", days, hours, mins, secs)
    } else if hours > 0 {
        format!("{}h {}m {}s", hours, mins, secs)
    } else if mins > 0 {
        format!("{}m {}s", mins, secs)
    } else {
        format!("{}s", secs)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(std::time::Duration::from_secs(5)), "5s");
        assert_eq!(format_duration(std::time::Duration::from_secs(65)), "1m 5s");
        assert_eq!(
            format_duration(std::time::Duration::from_secs(3665)),
            "1h 1m 5s"
        );
        assert_eq!(
            format_duration(std::time::Duration::from_secs(90065)),
            "1d 1h 1m 5s"
        );
    }

    #[test]
    fn test_get_config_path() {
        let path = get_config_path(None);
        assert!(path.ends_with("config.toml"));
    }
}
