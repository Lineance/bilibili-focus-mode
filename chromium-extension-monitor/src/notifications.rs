use crate::{
    notices::{escape_xml, Notice, NoticeKind},
    platform,
    registry::{self, VIEW64},
    storage,
};
use std::{
    fs, io,
    path::{Path, PathBuf},
};
use windows::{
    core::{Interface, HSTRING, PCWSTR},
    Data::Xml::Dom::XmlDocument,
    Win32::{
        Storage::EnhancedStorage::{PKEY_AppUserModel_ID, PKEY_AppUserModel_ToastActivatorCLSID},
        System::{
            Com::{
                CoCreateInstance, IPersistFile, StructuredStorage::PROPVARIANT,
                CLSCTX_INPROC_SERVER,
            },
            Variant::VT_LPWSTR,
        },
        UI::Shell::{IShellLinkW, PropertiesSystem::IPropertyStore, ShellLink},
    },
    UI::Notifications::{NotificationSetting, ToastNotification, ToastNotificationManager},
};

fn error(error: windows::core::Error) -> io::Error {
    io::Error::other(error.to_string())
}
pub struct Apartment;
impl Apartment {
    pub fn new() -> io::Result<Self> {
        unsafe {
            windows::Win32::System::WinRT::RoInitialize(
                windows::Win32::System::WinRT::RO_INIT_SINGLETHREADED,
            )
        }
        .map_err(error)?;
        Ok(Self)
    }
}
impl Drop for Apartment {
    fn drop(&mut self) {
        unsafe {
            windows::Win32::System::WinRT::RoUninitialize();
        }
    }
}
pub fn scheme(directory: &Path) -> String {
    storage::pipe_name(directory).replace(r"\\.\pipe\", "")
}
pub fn app_id(directory: &Path) -> String {
    format!(
        "com.bilibili.focus.{}",
        scheme(directory).trim_start_matches("bilibili-focus-monitor-")
    )
}
fn identity_key(directory: &Path) -> String {
    format!(r"Software\Classes\AppUserModelId\{}", app_id(directory))
}
fn protocol_key(directory: &Path) -> String {
    format!(r"Software\Classes\{}", scheme(directory))
}
pub fn shortcut(directory: &Path) -> io::Result<PathBuf> {
    Ok(PathBuf::from(
        std::env::var_os("APPDATA").ok_or_else(|| io::Error::other("APPDATA is unavailable"))?,
    )
    .join("Microsoft/Windows/Start Menu/Programs")
    .join(format!(
        "Bilibili 专注守护-{}.lnk",
        scheme(directory).trim_start_matches("bilibili-focus-monitor-")
    )))
}
fn owner(directory: &Path) -> String {
    platform::normalized(&directory.to_string_lossy())
}
fn expected_command(directory: &Path) -> String {
    format!(
        "\"{}\" --data-dir \"{}\" --activate \"%1\"",
        directory.join("bin/bilibili-focus-watchdog.exe").display(),
        directory.display()
    )
}

/// Per-user identity and protocol registration; only explicit installation does this.
pub fn install_identity(directory: &Path) -> io::Result<()> {
    let _apartment = Apartment::new()?;
    for key in [identity_key(directory), protocol_key(directory)] {
        if registry::read(&key, "DataDirectory", VIEW64)?
            .is_some_and(|existing| existing != owner(directory))
        {
            return Err(io::Error::other(
                "notification identity belongs to another installation",
            ));
        }
    }
    let link_path = shortcut(directory)?;
    if let Some(parent) = link_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let executable = directory.join("bin/bilibili-focus-watchdog.exe");
    let executable = platform::wide(&executable.to_string_lossy());
    let arguments = platform::wide(&format!(
        "--data-dir \"{}\" --settings",
        directory.display()
    ));
    let link: IShellLinkW =
        unsafe { CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER) }.map_err(error)?;
    unsafe {
        link.SetPath(PCWSTR(executable.as_ptr())).map_err(error)?;
        link.SetArguments(PCWSTR(arguments.as_ptr()))
            .map_err(error)?;
        link.SetDescription(windows::core::w!("Bilibili 专注守护：状态、暂停与配置"))
            .map_err(error)?;
        let store: IPropertyStore = link.cast().map_err(error)?;
        let id = platform::wide(&app_id(directory));
        let mut value = PROPVARIANT::default();
        (*value.Anonymous.Anonymous).vt = VT_LPWSTR;
        (*value.Anonymous.Anonymous).Anonymous.pwszVal =
            windows::Win32::UI::Shell::SHStrDupW(PCWSTR(id.as_ptr())).map_err(error)?;
        store
            .SetValue(&PKEY_AppUserModel_ID, &value)
            .map_err(error)?;
        let activator = windows::Win32::System::Com::StructuredStorage::InitPropVariantFromCLSID(
            &windows::core::GUID::from_u128(0xa9b55ca0_067d_4981_8cd2_be74d51473cf),
        )
        .map_err(error)?;
        store
            .SetValue(&PKEY_AppUserModel_ToastActivatorCLSID, &activator)
            .map_err(error)?;
        store.Commit().map_err(error)?;
        let persist: IPersistFile = link.cast().map_err(error)?;
        let path = platform::wide(&link_path.to_string_lossy());
        persist.Save(PCWSTR(path.as_ptr()), true).map_err(error)?;
    }
    let identity = identity_key(directory);
    let protocol = protocol_key(directory);
    registry::write(&identity, "DataDirectory", &owner(directory), VIEW64)?;
    registry::write(&identity, "DisplayName", "Bilibili 专注守护", VIEW64)?;
    registry::write(
        &identity,
        "CustomActivator",
        "{a9b55ca0-067d-4981-8cd2-be74d51473cf}",
        VIEW64,
    )?;
    registry::write(
        &identity,
        "IconUri",
        &directory
            .join("bin/bilibili-focus-watchdog.exe")
            .to_string_lossy(),
        VIEW64,
    )?;
    registry::write(&protocol, "DataDirectory", &owner(directory), VIEW64)?;
    registry::write(&protocol, "", "URL:Bilibili Focus Monitor", VIEW64)?;
    registry::write(&protocol, "URL Protocol", "", VIEW64)?;
    registry::write(
        &format!(r"{protocol}\shell\open\command"),
        "",
        &expected_command(directory),
        VIEW64,
    )?;
    let path = platform::wide(&link_path.to_string_lossy());
    unsafe {
        windows_sys::Win32::UI::Shell::SHChangeNotify(
            windows_sys::Win32::UI::Shell::SHCNE_CREATE as i32,
            windows_sys::Win32::UI::Shell::SHCNF_PATHW,
            path.as_ptr().cast(),
            std::ptr::null(),
        );
    }
    Ok(())
}

pub fn identity_ready(directory: &Path) -> bool {
    registry::read(&identity_key(directory), "DataDirectory", VIEW64)
        .ok()
        .flatten()
        .as_deref()
        == Some(&owner(directory))
        && registry::read(
            &format!(r"{}\shell\open\command", protocol_key(directory)),
            "",
            VIEW64,
        )
        .ok()
        .flatten()
        .as_deref()
            == Some(&expected_command(directory))
        && shortcut(directory).is_ok_and(|path| path.is_file())
}
pub fn remove_identity(directory: &Path) -> io::Result<()> {
    if registry::read(&identity_key(directory), "DataDirectory", VIEW64)?.as_deref()
        == Some(&owner(directory))
    {
        if let Ok(_apartment) = Apartment::new() {
            if let Err(error) = show(directory, &Notice::clear_for_cleanup()) {
                eprintln!("[Notifications] Cannot clear notification history: {error}");
            }
        }
        registry::delete_key(&identity_key(directory), VIEW64)?;
        let link = shortcut(directory)?;
        if link.exists() {
            fs::remove_file(link)?;
        }
    }
    if registry::read(&protocol_key(directory), "DataDirectory", VIEW64)?.as_deref()
        == Some(&owner(directory))
    {
        for suffix in [r"\shell\open\command", r"\shell\open", r"\shell", ""] {
            registry::delete_key(&format!("{}{suffix}", protocol_key(directory)), VIEW64)?;
        }
    }
    Ok(())
}

pub fn action(directory: &Path, uri: &str) -> io::Result<&'static str> {
    let prefix = format!("{}://", scheme(directory));
    match uri.strip_prefix(&prefix).map(|s| s.trim_end_matches('/')) {
        Some("status") => Ok("status"),
        Some("pause") => Ok("pause"),
        Some("resume") => Ok("resume"),
        Some("diagnostics") => Ok("diagnostics"),
        _ => Err(io::Error::other("unknown notification action")),
    }
}

pub fn show(directory: &Path, notice: &Notice) -> io::Result<()> {
    if notice.kind == NoticeKind::Clear {
        ToastNotificationManager::History()
            .map_err(error)?
            .RemoveGroupedTagWithId(
                &HSTRING::from("state"),
                &HSTRING::from("supervision"),
                &HSTRING::from(app_id(directory)),
            )
            .map_err(error)?;
        return Ok(());
    }
    if !identity_ready(directory) {
        return Err(io::Error::other(
            "notification identity is not registered; run notification setup or reinstall",
        ));
    }
    let identity = platform::wide(&app_id(directory));
    let code = unsafe {
        windows_sys::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID(identity.as_ptr())
    };
    if code < 0 {
        return Err(io::Error::other(format!(
            "cannot set notification application identity: {code:#x}"
        )));
    }
    let notifier =
        ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(app_id(directory)))
            .map_err(error)?;
    match notifier.Setting() {
        Ok(setting) if setting != NotificationSetting::Enabled => {
            return Err(io::Error::other(format!(
                "Windows notification setting is {setting:?}"
            )))
        }
        Err(error) if error.code().0 as u32 == 0x80070490 => eprintln!(
            "[Notifications] First notification has no settings entry yet; submitting to Windows"
        ),
        Err(error) => return Err(io::Error::other(format!("Toast.Setting: {error}"))),
        _ => {}
    }
    let scheme = escape_xml(&scheme(directory));
    let xml = format!(
        r#"<toast launch="{scheme}://status" activationType="protocol"><visual><binding template="ToastGeneric"><text>{}</text><text>{}</text></binding></visual><actions><action content="查看状态" activationType="protocol" arguments="{scheme}://status"/><action content="暂停保护" activationType="protocol" arguments="{scheme}://pause"/></actions><audio silent="true"/></toast>"#,
        escape_xml(&notice.title),
        escape_xml(&notice.body)
    );
    let document = XmlDocument::new().map_err(error)?;
    document.LoadXml(&HSTRING::from(xml)).map_err(error)?;
    let toast = ToastNotification::CreateToastNotification(&document).map_err(error)?;
    toast.SetTag(&HSTRING::from("state")).map_err(error)?;
    toast
        .SetGroup(&HSTRING::from("supervision"))
        .map_err(error)?;
    notifier
        .Show(&toast)
        .map_err(|e| io::Error::other(format!("Toast.Show: {e}")))
}

pub fn diagnostics(directory: &Path) -> serde_json::Value {
    let result = (|| -> io::Result<(String, u32)> {
        let _apartment = Apartment::new()?;
        let notifier =
            ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(app_id(directory)))
                .map_err(error)?;
        let setting = format!("{:?}", notifier.Setting().map_err(error)?);
        let count = ToastNotificationManager::History()
            .map_err(error)?
            .GetHistoryWithId(&HSTRING::from(app_id(directory)))
            .map_err(error)?
            .Size()
            .map_err(error)?;
        Ok((setting, count))
    })();
    match result {
        Ok((setting, count)) => {
            serde_json::json!({"registered":identity_ready(directory),"appId":app_id(directory),"setting":setting,"historyCount":count,"visibleConfirmed":false})
        }
        Err(error) => {
            serde_json::json!({"registered":identity_ready(directory),"error":error.to_string()})
        }
    }
}

pub fn test(directory: &Path) -> io::Result<serde_json::Value> {
    let _apartment = Apartment::new()?;
    show(directory, &Notice::test())?;
    Ok(
        serde_json::json!({"submitted":true,"visibleConfirmed":false,"message":"Windows 已接受通知，请人工确认通知中心或屏幕显示。"}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn activation_only_accepts_known_actions_for_this_installation() {
        let dir = std::env::temp_dir();
        assert_eq!(
            action(&dir, &format!("{}://pause", scheme(&dir))).unwrap(),
            "pause"
        );
        assert!(action(&dir, "https://example.com/pause").is_err());
        assert!(action(&dir, &format!("{}://pause --enable", scheme(&dir))).is_err());
    }
}
