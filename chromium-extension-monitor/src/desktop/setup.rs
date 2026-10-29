use super::*;
use windows_sys::Win32::UI::Controls::Dialogs::{
    GetOpenFileNameW, OFN_FILEMUSTEXIST, OFN_NOCHANGEDIR, OFN_PATHMUSTEXIST, OPENFILENAMEW,
};
const EXE: u16 = 601;
const DATA: u16 = 602;
const ID: u16 = 603;
const LOGIN: u16 = 604;
const KIND: u16 = 605;
const DEFAULT_PROFILE: u16 = 606;
const SAVE: u16 = 620;
const PICK: u16 = 621;
const OPEN: u16 = 622;

fn preserve_default_profile(
    existing: Option<&crate::config::Config>,
    browser: &Path,
    profile: &Path,
) -> bool {
    existing.is_some_and(|c| {
        c.target.allow_default_profile
            && crate::platform::normalized(&c.target.user_data_dir.to_string_lossy())
                == crate::platform::normalized(&profile.to_string_lossy())
            && crate::platform::normalized(&c.target.browser_path.to_string_lossy())
                == crate::platform::normalized(&browser.to_string_lossy())
    })
}
pub fn browser_candidates() -> Vec<PathBuf> {
    let mut candidates = vec![];
    for root in [
        std::env::var_os("PROGRAMFILES"),
        std::env::var_os("PROGRAMFILES(X86)"),
        std::env::var_os("LOCALAPPDATA"),
    ]
    .into_iter()
    .flatten()
    {
        for suffix in [
            "Google/Chrome/Application/chrome.exe",
            "Chromium/Application/chrome.exe",
        ] {
            candidates.push(PathBuf::from(&root).join(suffix));
        }
    }
    if let Some(path) = std::env::var_os("PATH") {
        for entry in std::env::split_paths(&path) {
            if entry
                .file_name()
                .is_some_and(|name| name.eq_ignore_ascii_case("shims"))
            {
                if let Some(parent) = entry.parent() {
                    candidates.push(parent.join("apps/googlechrome/current/chrome.exe"));
                }
            }
        }
    }
    candidates
        .into_iter()
        .filter(|p| p.is_file())
        .map(|p| {
            std::fs::canonicalize(&p)
                .map(|p| crate::platform::plain_path(&p))
                .unwrap_or(p)
        })
        .collect()
}
fn value(hwnd: HWND) -> String {
    let length = unsafe { GetWindowTextLengthW(hwnd) }.clamp(0, 32767) as usize;
    let mut text = vec![0u16; length + 1];
    let count =
        unsafe { GetWindowTextW(hwnd, text.as_mut_ptr(), text.len() as i32) }.max(0) as usize;
    String::from_utf16_lossy(&text[..count])
        .trim()
        .trim_matches('"')
        .to_owned()
}
fn pick(parent: HWND) -> io::Result<Option<PathBuf>> {
    let mut buffer = vec![0u16; 32768];
    let filter = wide("Chromium 浏览器\0chrome.exe\0可执行文件\0*.exe\0");
    let title = wide("选择 Chrome 或 Chromium 程序");
    let mut options = OPENFILENAMEW {
        lStructSize: std::mem::size_of::<OPENFILENAMEW>() as u32,
        hwndOwner: parent,
        lpstrFilter: filter.as_ptr(),
        lpstrFile: buffer.as_mut_ptr(),
        nMaxFile: buffer.len() as u32,
        lpstrTitle: title.as_ptr(),
        Flags: OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR,
        ..unsafe { zeroed() }
    };
    if unsafe { GetOpenFileNameW(&mut options) } != 0 {
        let n = buffer.iter().position(|v| *v == 0).unwrap_or(0);
        return Ok(Some(PathBuf::from(String::from_utf16_lossy(&buffer[..n]))));
    }
    let error = unsafe { windows_sys::Win32::UI::Controls::Dialogs::CommDlgExtendedError() };
    if error != 0 {
        return Err(io::Error::other(format!("file picker failed: {error}")));
    }
    Ok(None)
}

pub fn launch(directory: &Path) -> io::Result<Value> {
    std::fs::create_dir_all(directory)?;
    let installed = directory.join("bin/bilibili-focus-watchdog.exe");
    let sibling = std::env::current_exe()?
        .parent()
        .ok_or_else(|| io::Error::other("missing distribution directory"))?
        .join("bilibili-focus-watchdog.exe");
    let binary = if sibling.is_file() {
        sibling
    } else {
        installed
    };
    let mut command = std::process::Command::new(binary);
    command.arg("--data-dir").arg(directory).arg("--setup");
    windows_runtime::spawn_detached(&mut command)?;
    Ok(json!({"setupOpened":true}))
}

pub fn run(directory: &Path) -> io::Result<()> {
    std::fs::create_dir_all(directory)?;
    let _lock = windows_runtime::InstanceLock::acquire(&format!(
        r"Local\FocusSetup-{}",
        notifications::scheme(directory)
    ))?;
    let _font = FontGuard::new();
    let _apartment = notifications::Apartment::new()?;
    let (sender, commands) = mpsc::channel();
    let main = window("Bilibili 专注守护 · 配置", 760, 480, &sender, false)?;
    let existing = storage::read_config(directory).ok();
    control(
        main,
        "STATIC",
        "选择浏览器、独立数据目录和扩展 ID，然后完成连接验证。保存会暂停当前保护。",
        0,
        18,
        14,
        710,
        28,
        0,
    );
    control(main, "STATIC", "浏览器程序", 0, 18, 54, 110, 24, 0);
    let browser = existing
        .as_ref()
        .map(|c| c.target.browser_path.clone())
        .or_else(|| browser_candidates().into_iter().next())
        .unwrap_or_default();
    let exe = control(
        main,
        "EDIT",
        &browser.to_string_lossy(),
        EXE,
        132,
        50,
        490,
        28,
        WS_BORDER | ES_AUTOHSCROLL as u32 | WS_TABSTOP,
    );
    control(main, "BUTTON", "选择…", PICK, 634, 50, 90, 28, WS_TABSTOP);
    control(main, "STATIC", "数据目录", 0, 18, 96, 110, 24, 0);
    let default = PathBuf::from(
        std::env::var_os("LOCALAPPDATA")
            .ok_or_else(|| io::Error::other("LOCALAPPDATA unavailable"))?,
    )
    .join("BilibiliFocusBrowser");
    let profile = existing
        .as_ref()
        .map(|c| &c.target.user_data_dir)
        .unwrap_or(&default);
    let data = control(
        main,
        "EDIT",
        &profile.to_string_lossy(),
        DATA,
        132,
        92,
        592,
        28,
        WS_BORDER | ES_AUTOHSCROLL as u32 | WS_TABSTOP,
    );
    control(main, "STATIC", "扩展 ID", 0, 18, 138, 110, 24, 0);
    let id = control(
        main,
        "EDIT",
        existing
            .as_ref()
            .map(|c| c.target.extension_id.as_str())
            .unwrap_or(""),
        ID,
        132,
        134,
        592,
        28,
        WS_BORDER | ES_AUTOHSCROLL as u32 | WS_TABSTOP,
    );
    let login = control(
        main,
        "BUTTON",
        "登录 Windows 后自动运行",
        LOGIN,
        132,
        176,
        300,
        28,
        BS_AUTOCHECKBOX as u32 | WS_TABSTOP,
    );
    let kind = control(
        main,
        "COMBOBOX",
        "",
        KIND,
        444,
        176,
        280,
        150,
        CBS_DROPDOWNLIST as u32 | WS_TABSTOP,
    );
    for label in ["Google Chrome / Chrome for Testing", "Chromium"] {
        let label = wide(label);
        unsafe {
            SendMessageW(kind, CB_ADDSTRING, 0, label.as_ptr() as isize);
        }
    }
    unsafe {
        SendMessageW(
            kind,
            CB_SETCURSEL,
            usize::from(
                existing
                    .as_ref()
                    .is_some_and(|c| c.target.registry_browser == "chromium"),
            ),
            0,
        );
    }
    let default_scope = control(
        main,
        "BUTTON",
        "允许监控默认 Chrome 实例",
        DEFAULT_PROFILE,
        132,
        212,
        300,
        28,
        BS_AUTOCHECKBOX as u32 | WS_TABSTOP,
    );
    unsafe {
        SendMessageW(
            default_scope,
            BM_SETCHECK,
            usize::from(preserve_default_profile(
                existing.as_ref(),
                &browser,
                profile,
            )),
            0,
        );
    }
    let checked = if existing.is_none() {
        true
    } else {
        install::autostart_enabled(directory).unwrap_or(false)
    };
    unsafe {
        SendMessageW(login, BM_SETCHECK, usize::from(checked), 0);
    }
    control(main,"STATIC","注意：超时会关闭该数据目录中的整个浏览器实例。推荐使用独立目录；只有勾选默认实例时才监控未带 --user-data-dir 的主 Chrome。打开浏览器扩展页加载插件后，复制 ID 到上方。保护默认关闭，需完成握手后再启用。",0,18,242,710,45,0);
    control(
        main,
        "BUTTON",
        "保存并启动",
        SAVE,
        132,
        308,
        150,
        34,
        WS_TABSTOP,
    );
    control(
        main,
        "BUTTON",
        "打开浏览器扩展页",
        OPEN,
        300,
        308,
        220,
        34,
        WS_TABSTOP,
    );
    let feedback = control(
        main,
        "EDIT",
        if existing.is_none() && directory.join("config.json").exists() {
            "原配置无法读取。保存时将保留备份并重新配置。"
        } else {
            "保存后会打开状态窗口，可测试通知、查看诊断并启用保护。"
        },
        630,
        18,
        350,
        710,
        100,
        WS_BORDER | WS_VSCROLL | ES_MULTILINE as u32 | ES_READONLY as u32 | WS_TABSTOP,
    );
    reveal(main, true);
    let (done, result) = mpsc::channel::<Result<(), String>>();
    let mut busy = false;
    'ui: loop {
        for command in commands.try_iter() {
            match command {
                Command::Close(_) => {
                    if busy {
                        text(feedback, "正在保存，请等待操作完成。");
                    } else {
                        break 'ui;
                    }
                }
                Command::Click(PICK) if !busy => match pick(main) {
                    Ok(Some(path)) => text(exe, &path.to_string_lossy()),
                    Ok(None) => {}
                    Err(error) => text(feedback, &error.to_string()),
                },
                Command::Click(OPEN) if !busy => {
                    let path = value(exe);
                    let profile = value(data);
                    if let Err(error) = std::process::Command::new(path)
                        .arg(format!("--user-data-dir={profile}"))
                        .arg("chrome://extensions")
                        .spawn()
                    {
                        text(feedback, &format!("无法打开浏览器：{error}"));
                    }
                }
                Command::Click(SAVE) if !busy => {
                    let path = PathBuf::from(value(exe));
                    let profile = PathBuf::from(value(data));
                    let extension = value(id);
                    if !path.is_file() {
                        text(feedback, "请选择实际的 chrome.exe 文件。");
                        continue;
                    }
                    if !crate::config::valid_extension_id(&extension) {
                        text(feedback, "扩展 ID 必须是 32 位 a-p 小写字母。");
                        continue;
                    }
                    if !profile.is_absolute() {
                        text(feedback, "请输入数据目录的绝对路径。");
                        continue;
                    }
                    let autostart = unsafe { SendMessageW(login, BM_GETCHECK, 0, 0) } == 1;
                    let registry_browser = if unsafe { SendMessageW(kind, CB_GETCURSEL, 0, 0) } == 1
                    {
                        "chromium".into()
                    } else {
                        "chrome".into()
                    };
                    let allow_default_profile =
                        unsafe { SendMessageW(default_scope, BM_GETCHECK, 0, 0) == 1 };
                    let target = crate::config::Target {
                        browser_path: path,
                        user_data_dir: profile,
                        extension_id: extension,
                        allow_default_profile,
                        registry_browser,
                    };
                    busy = true;
                    text(feedback, "正在保存登记并启动监控，保护会保持暂停。");
                    let directory = directory.to_owned();
                    let done = done.clone();
                    thread::spawn(move || {
                        let operation = (|| -> io::Result<()> {
                            if daemon::request(&directory, "status").is_ok() {
                                install::stop(&directory)?;
                            }
                            let config = directory.join("config.json");
                            if config.exists() && storage::read_config(&directory).is_err() {
                                std::fs::rename(
                                    &config,
                                    directory.join(format!(
                                        "config-backup-{}.json",
                                        storage::timestamp()
                                    )),
                                )?;
                            }
                            if let Ok(old) = storage::read_config(&directory) {
                                if old.target.registry_browser != target.registry_browser {
                                    install::uninstall(&directory)?;
                                }
                            }
                            install::install(&directory, target, autostart)?;
                            install::autostart(&directory, autostart)?;
                            install::start(&directory, false, true)?;
                            daemon::request(&directory, "show")?;
                            Ok(())
                        })();
                        let _ = done.send(operation.map_err(|e| e.to_string()));
                    });
                }
                _ => {}
            }
        }
        if let Ok(outcome) = result.try_recv() {
            busy = false;
            match outcome {
                Ok(()) => break,
                Err(error) => text(feedback, &format!("{} {error}", friendly_error(&error))),
            }
        }
        let mut message: MSG = unsafe { zeroed() };
        while unsafe { PeekMessageW(&mut message, null_mut(), 0, 0, PM_REMOVE) } != 0 {
            if unsafe { IsDialogMessageW(main, &message) } == 0 {
                unsafe {
                    TranslateMessage(&message);
                    DispatchMessageW(&message);
                }
            }
        }
        thread::sleep(Duration::from_millis(50));
    }
    unsafe {
        SetWindowLongPtrW(main, GWLP_USERDATA, 0);
        DestroyWindow(main);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn changing_scope_never_keeps_the_default_browser_fallback() {
        let browser = std::env::current_exe().unwrap();
        let profile = std::env::temp_dir().join("focus-old");
        let config = crate::config::Config {
            version: 1,
            enabled: false,
            timing: Default::default(),
            target: crate::config::Target {
                browser_path: browser.clone(),
                user_data_dir: profile.clone(),
                extension_id: "abcdefghijklmnopabcdefghijklmnop".into(),
                allow_default_profile: true,
                registry_browser: "chrome".into(),
            },
        };
        assert!(preserve_default_profile(Some(&config), &browser, &profile));
        assert!(!preserve_default_profile(
            Some(&config),
            &browser,
            &std::env::temp_dir().join("focus-new")
        ));
        assert!(!preserve_default_profile(None, &browser, &profile));
    }
}
