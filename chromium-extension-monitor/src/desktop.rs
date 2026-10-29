pub mod setup;
use crate::{
    daemon, install,
    notices::{friendly_error, NoticeKind, NoticePolicy},
    notifications,
    platform::wide,
    storage, windows_runtime,
};
use serde_json::{json, Value};
use std::{
    io,
    mem::zeroed,
    path::{Path, PathBuf},
    ptr::{null, null_mut},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
    thread,
    time::Duration,
};
use windows_sys::Win32::{
    Foundation::{COLORREF, HWND, LPARAM, LRESULT, WPARAM},
    Graphics::Gdi::{
        CreateBitmap, CreateSolidBrush, DeleteObject, GetStockObject, SetBkColor, SetTextColor,
        DEFAULT_GUI_FONT, HBITMAP, HBRUSH, HDC,
    },
    System::LibraryLoader::GetModuleHandleW,
    UI::WindowsAndMessaging::*,
};

pub(crate) const CONFIG: u16 = 109;
const LOGIN: u16 = 110;
const PAUSE: u16 = 101;
const RESUME: u16 = 102;
const DIAGNOSE: u16 = 103;
const LOGS: u16 = 104;
const TEST: u16 = 105;
const BROWSER: u16 = 106;
const EXIT: u16 = 107;
const BG_COLOR: COLORREF = 0x00130d0a;
const TEXT_COLOR: COLORREF = 0x00f7ede8;
const MUTED_COLOR: COLORREF = 0x00c6b2a6;

thread_local! {
    static WINDOW_BRUSH: std::cell::Cell<HBRUSH> = const { std::cell::Cell::new(std::ptr::null_mut()) };
    static APP_ICON: std::cell::Cell<HICON> =
        const { std::cell::Cell::new(std::ptr::null_mut()) };
}

fn window_brush() -> HBRUSH {
    WINDOW_BRUSH.with(|slot| {
        if slot.get().is_null() {
            let brush = unsafe { CreateSolidBrush(BG_COLOR) };
            slot.set(brush);
        }
        slot.get()
    })
}

/// Build the shield/check mark used by the native windows and tray.
/// Keeping it in code avoids a separate resource DLL and scales cleanly with DPI.
pub(crate) fn app_icon() -> HICON {
    APP_ICON.with(|slot| {
        if !slot.get().is_null() {
            return slot.get();
        }
        let mut color = [0u32; 32 * 32];
        let mut mask = [0xffu8; 32 * 32 / 8];
        for y in 3..29 {
            let half = if y < 10 {
                4 + (y - 3)
            } else {
                11 - ((y - 10) / 5)
            };
            let left = 16 - half;
            let right = 16 + half;
            for x in left..=right {
                let index = y * 32 + x;
                color[index as usize] = 0x00f7a27a;
                mask[(index as usize) / 8] &= !(0x80 >> (index % 8));
            }
        }
        for (x, y) in [
            (11, 16),
            (12, 17),
            (13, 18),
            (14, 17),
            (15, 16),
            (16, 15),
            (17, 14),
            (18, 13),
            (19, 12),
            (20, 11),
        ] {
            color[(y * 32 + x) as usize] = 0x00f7ede8;
        }
        let mask_bitmap: HBITMAP = unsafe { CreateBitmap(32, 32, 1, 1, mask.as_ptr().cast()) };
        let color_bitmap: HBITMAP = unsafe { CreateBitmap(32, 32, 1, 32, color.as_ptr().cast()) };
        let icon = if mask_bitmap.is_null() || color_bitmap.is_null() {
            std::ptr::null_mut()
        } else {
            let info = ICONINFO {
                fIcon: 1,
                xHotspot: 0,
                yHotspot: 0,
                hbmMask: mask_bitmap,
                hbmColor: color_bitmap,
            };
            unsafe { CreateIconIndirect(&info) }
        };
        if !mask_bitmap.is_null() {
            unsafe { DeleteObject(mask_bitmap) };
        }
        if !color_bitmap.is_null() {
            unsafe { DeleteObject(color_bitmap) };
        }
        let icon = if icon.is_null() {
            unsafe { LoadIconW(null_mut(), IDI_SHIELD) }
        } else {
            icon
        };
        slot.set(icon);
        icon
    })
}
#[derive(Debug)]
enum Command {
    Menu,
    RestoreTray,
    Click(u16),
    Close(HWND),
}
static TASKBAR_MESSAGE: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
unsafe extern "system" fn window_proc(
    hwnd: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    let sender = unsafe { GetWindowLongPtrW(hwnd, GWLP_USERDATA) } as *const mpsc::Sender<Command>;
    if matches!(
        message,
        WM_CTLCOLORSTATIC | WM_CTLCOLOREDIT | WM_CTLCOLORBTN
    ) {
        let hdc = wparam as HDC;
        unsafe {
            SetBkColor(hdc, BG_COLOR);
            SetTextColor(
                hdc,
                if message == WM_CTLCOLOREDIT {
                    TEXT_COLOR
                } else {
                    MUTED_COLOR
                },
            );
        }
        return window_brush() as LRESULT;
    }
    if !sender.is_null() {
        let command = match message {
            crate::tray::CALLBACK => match (lparam as u32) & 0xffff {
                WM_LBUTTONDBLCLK => Some(Command::Click(crate::tray::SHOW)),
                WM_RBUTTONUP | WM_CONTEXTMENU => Some(Command::Menu),
                _ => None,
            },
            value if value != 0 && value == TASKBAR_MESSAGE.load(Ordering::SeqCst) => {
                Some(Command::RestoreTray)
            }
            WM_COMMAND => Some(Command::Click((wparam & 0xffff) as u16)),
            WM_CLOSE => Some(Command::Close(hwnd)),
            _ => None,
        };
        if let Some(command) = command {
            let _ = unsafe { &*sender }.send(command);
            return 0;
        }
    }
    unsafe { DefWindowProcW(hwnd, message, wparam, lparam) }
}
fn scale(value: i32) -> i32 {
    let dpi = unsafe { windows_sys::Win32::UI::HiDpi::GetDpiForSystem() }.max(96) as i32;
    value * dpi / 96
}
thread_local! {static FONT:std::cell::Cell<*mut std::ffi::c_void>=const{std::cell::Cell::new(std::ptr::null_mut())};}
struct FontGuard(*mut std::ffi::c_void);
impl FontGuard {
    fn new() -> Self {
        unsafe {
            windows_sys::Win32::UI::HiDpi::SetThreadDpiAwarenessContext(
                windows_sys::Win32::UI::HiDpi::DPI_AWARENESS_CONTEXT_SYSTEM_AWARE,
            );
        }
        let face = wide("Segoe UI");
        let font = unsafe {
            windows_sys::Win32::Graphics::Gdi::CreateFontW(
                -scale(15),
                0,
                0,
                0,
                400,
                0,
                0,
                0,
                1,
                0,
                0,
                5,
                0,
                face.as_ptr(),
            )
        };
        FONT.with(|slot| slot.set(font));
        Self(font)
    }
}
impl Drop for FontGuard {
    fn drop(&mut self) {
        FONT.with(|slot| slot.set(null_mut()));
        if !self.0.is_null() {
            unsafe {
                windows_sys::Win32::Graphics::Gdi::DeleteObject(self.0);
            }
        }
    }
}
fn window(
    title: &str,
    width: i32,
    height: i32,
    sender: &mpsc::Sender<Command>,
    top: bool,
) -> io::Result<HWND> {
    let class = wide("BilibiliFocusDesktop");
    let title = wide(title);
    let module = unsafe { GetModuleHandleW(null()) };
    let wc = WNDCLASSW {
        lpfnWndProc: Some(window_proc),
        hInstance: module,
        hCursor: unsafe { LoadCursorW(null_mut(), IDC_ARROW) },
        hIcon: app_icon(),
        hbrBackground: window_brush(),
        lpszClassName: class.as_ptr(),
        ..unsafe { zeroed() }
    };
    unsafe {
        RegisterClassW(&wc);
    }
    let hwnd = unsafe {
        CreateWindowExW(
            if top {
                WS_EX_TOPMOST | WS_EX_TOOLWINDOW
            } else {
                0
            },
            class.as_ptr(),
            title.as_ptr(),
            WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            scale(width),
            scale(height),
            null_mut(),
            null_mut(),
            module,
            null(),
        )
    };
    if hwnd.is_null() {
        return Err(io::Error::last_os_error());
    }
    unsafe {
        SetWindowLongPtrW(hwnd, GWLP_USERDATA, sender as *const _ as isize);
    }
    Ok(hwnd)
}
#[allow(
    clippy::too_many_arguments,
    reason = "Native controls specify a rectangle and Win32 styles at this boundary"
)]
fn control(
    parent: HWND,
    class: &str,
    text: &str,
    id: u16,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    style: u32,
) -> HWND {
    let is_button = class == "BUTTON";
    let class = wide(class);
    let text = wide(text);
    let style = if is_button {
        style | BS_FLAT as u32
    } else {
        style
    };
    let hwnd = unsafe {
        CreateWindowExW(
            0,
            class.as_ptr(),
            text.as_ptr(),
            WS_CHILD | WS_VISIBLE | style,
            scale(x),
            scale(y),
            scale(w),
            scale(h),
            parent,
            id as usize as _,
            null_mut(),
            null(),
        )
    };
    unsafe {
        SendMessageW(
            hwnd,
            WM_SETFONT,
            FONT.with(|slot| {
                if slot.get().is_null() {
                    GetStockObject(DEFAULT_GUI_FONT)
                } else {
                    slot.get()
                }
            }) as usize,
            1,
        );
    }
    hwnd
}
fn text(hwnd: HWND, value: &str) {
    let value = wide(value);
    unsafe {
        SetWindowTextW(hwnd, value.as_ptr());
    }
}
fn reveal(hwnd: HWND, foreground: bool) {
    unsafe {
        ShowWindow(
            hwnd,
            if foreground {
                SW_RESTORE
            } else {
                SW_SHOWNOACTIVATE
            },
        );
        if foreground {
            SetForegroundWindow(hwnd);
        }
    }
}

pub fn show_error(title: &str, body: &str) {
    let title = wide(title);
    let body = wide(body);
    unsafe {
        MessageBoxW(
            null_mut(),
            body.as_ptr(),
            title.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
}
pub fn describe(status: &Value) -> String {
    if status["watchdogRunning"] != true {
        return "监控程序未运行".into();
    }
    let label = match status["state"].as_str().unwrap_or("") {
        "paused" => "保护已暂停",
        "monitoring" => "保护运行中",
        "idle" => "等待登记的浏览器启动",
        "awaitingExtension" => "等待专注扩展连接",
        "gracePeriod" => "扩展已失联，正在等待恢复",
        "closing" | "terminating" => "正在关闭登记的浏览器",
        "wouldClose" => "模拟模式：已达到关闭条件",
        "faulted" => "监控需要处理",
        _ => "正在初始化",
    };
    let mode = if status["dryRun"] == true {
        "（模拟模式，不会实际关闭）"
    } else {
        ""
    };
    format!("{label}{mode}")
}
pub fn open_logs(directory: &Path) -> io::Result<()> {
    let result = std::process::Command::new("explorer.exe")
        .arg(directory)
        .spawn()?;
    drop(result);
    Ok(())
}
pub fn open_browser(directory: &Path) -> io::Result<()> {
    let config = storage::read_config(directory)?;
    std::process::Command::new(config.target.browser_path)
        .arg(format!(
            "--user-data-dir={}",
            config.target.user_data_dir.display()
        ))
        .arg(format!(
            "chrome-extension://{}/src/manager/index.html",
            config.target.extension_id
        ))
        .spawn()?;
    Ok(())
}

pub fn start(
    directory: PathBuf,
    status: Arc<Mutex<Value>>,
    show: Arc<AtomicBool>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        if let Err(error) = run(&directory, status, show) {
            let _ = storage::write_json(
                &directory.join("desktop-status.json"),
                &json!({"running":false,"error":error.to_string()}),
            );
            show_error("专注守护界面启动失败", &error.to_string());
        }
    })
}

fn run(directory: &Path, status: Arc<Mutex<Value>>, show: Arc<AtomicBool>) -> io::Result<()> {
    let _font = FontGuard::new();
    let _apartment = notifications::Apartment::new()?;
    let (sender, commands) = mpsc::channel();
    let main = window("Bilibili 专注守护", 640, 460, &sender, false)?;
    let taskbar = wide("TaskbarCreated");
    TASKBAR_MESSAGE.store(
        unsafe { RegisterWindowMessageW(taskbar.as_ptr()) },
        Ordering::SeqCst,
    );
    let mut tray = crate::tray::Tray::new(main);
    let mut tray_last_try = 0;
    let mut tray_state = String::new();
    let summary = control(main, "STATIC", "正在读取状态…", 0, 20, 16, 590, 70, 0);
    let details = control(main, "STATIC", "", 0, 20, 90, 590, 90, 0);
    control(
        main,
        "BUTTON",
        "暂停保护",
        PAUSE,
        20,
        200,
        130,
        34,
        WS_TABSTOP,
    );
    control(
        main,
        "BUTTON",
        "恢复保护",
        RESUME,
        160,
        200,
        130,
        34,
        WS_TABSTOP,
    );
    control(
        main,
        "BUTTON",
        "查看诊断",
        DIAGNOSE,
        300,
        200,
        130,
        34,
        WS_TABSTOP,
    );
    control(
        main,
        "BUTTON",
        "打开日志",
        LOGS,
        440,
        200,
        130,
        34,
        WS_TABSTOP,
    );
    control(
        main,
        "BUTTON",
        "测试通知",
        TEST,
        20,
        244,
        130,
        34,
        WS_TABSTOP,
    );
    control(
        main,
        "BUTTON",
        "扩展管理页",
        BROWSER,
        160,
        244,
        130,
        34,
        WS_TABSTOP,
    );
    control(
        main,
        "BUTTON",
        "重新配置",
        CONFIG,
        300,
        244,
        130,
        34,
        WS_TABSTOP,
    );
    control(
        main,
        "BUTTON",
        "登录启动开关",
        LOGIN,
        440,
        244,
        130,
        34,
        WS_TABSTOP,
    );
    let feedback = control(
        main,
        "EDIT",
        "关闭此窗口不会暂停保护。",
        150,
        20,
        290,
        590,
        100,
        WS_BORDER | WS_VSCROLL | ES_MULTILINE as u32 | ES_READONLY as u32 | WS_TABSTOP,
    );
    let countdown = window("专注扩展已失联", 530, 220, &sender, true)?;
    let countdown_text = control(countdown, "STATIC", "", 0, 18, 18, 480, 90, 0);
    control(
        countdown,
        "BUTTON",
        "暂停保护",
        PAUSE,
        18,
        125,
        140,
        34,
        WS_TABSTOP,
    );
    let (done, result) = mpsc::channel::<Result<String, String>>();
    let mut busy = false;
    let mut policy = NoticePolicy::default();
    let mut dismissed = None;
    let mut last_view = String::new();
    loop {
        let current = status
            .lock()
            .map_err(|_| io::Error::other("desktop status lock poisoned"))?
            .clone();
        if current["stopped"] == true {
            let _ = notifications::show(
                directory,
                &crate::notices::Notice {
                    kind: NoticeKind::Clear,
                    title: String::new(),
                    body: String::new(),
                },
            );
            break;
        }
        for notice in policy.observe(&current, windows_runtime::active_time()?) {
            let outcome = notifications::show(directory, &notice);
            let report = match &outcome {
                Ok(()) => {
                    json!({"running":true,"lastNotice":notice.kind,"apiAccepted":true,"visibleConfirmed":false})
                }
                Err(error) => {
                    json!({"running":true,"lastNotice":notice.kind,"apiAccepted":false,"error":error.to_string()})
                }
            };
            let _ = storage::write_json(&directory.join("desktop-status.json"), &report);
            if let Err(error) = outcome {
                text(
                    feedback,
                    &format!("系统通知不可用：{error}。倒计时提示仍可用。"),
                );
            }
        }
        let now = windows_runtime::active_time()?;
        if now.saturating_sub(tray_last_try) >= 1000 {
            tray_last_try = now;
            let result = tray.update(&current);
            let message = match &result {
                Ok(_) => "ready".into(),
                Err(error) => error.to_string(),
            };
            if message != tray_state {
                let _ = storage::write_json(
                    &directory.join("tray-status.json"),
                    &json!({"registered":result.is_ok(),"detail":message,"updatedAt":storage::timestamp()}),
                );
                tray_state = message;
            }
        }
        let view = format!(
            "{}\n通信：{}",
            describe(&current),
            if current["extensionConnected"] == true {
                "已连接"
            } else {
                "未连接"
            }
        );
        if view != last_view {
            text(summary, &view);
            let target = storage::read_config(directory)
                .ok()
                .map(|c| {
                    format!(
                        "浏览器：{}\n数据目录：{}",
                        c.target.browser_path.display(),
                        c.target.user_data_dir.display()
                    )
                })
                .unwrap_or_default();
            let reason = current["reason"]
                .as_str()
                .map(|r| format!("\n{}", friendly_error(r)))
                .unwrap_or_default();
            text(details, &format!("{target}{reason}"));
            last_view = view;
        }
        let warning = matches!(
            current["state"].as_str(),
            Some("gracePeriod" | "closing" | "wouldClose")
        );
        if warning && dismissed != Some(policy.incident()) {
            let remaining = current["remainingMs"].as_u64().unwrap_or(0).div_ceil(1000);
            text(
                countdown_text,
                &format!(
                    "{}\n剩余 {remaining} 秒。恢复连接后会自动取消。\n{}",
                    describe(&current),
                    if current["dryRun"] == true {
                        "模拟模式，不会实际关闭浏览器。"
                    } else {
                        "超时将关闭登记的整个浏览器实例。"
                    }
                ),
            );
            reveal(countdown, false);
        } else {
            unsafe {
                ShowWindow(countdown, SW_HIDE);
            }
        }
        if show.swap(false, Ordering::SeqCst) {
            reveal(main, true);
        }
        for command in commands.try_iter() {
            match command {
                Command::RestoreTray => tray.reset(),
                Command::Menu => {
                    if let Some(id) = tray.menu(&current) {
                        let _ = sender.send(Command::Click(id));
                    }
                }
                Command::Click(crate::tray::SHOW) => reveal(main, true),
                Command::Close(hwnd) => {
                    if hwnd == countdown {
                        dismissed = Some(policy.incident());
                    }
                    unsafe {
                        ShowWindow(hwnd, SW_HIDE);
                    }
                }
                Command::Click(id) if !busy => {
                    busy = true;
                    text(feedback, "正在处理…");
                    let done = done.clone();
                    let directory = directory.to_owned();
                    thread::spawn(move || {
                        let outcome = (|| -> io::Result<String> {
                            match id {
                                CONFIG => {
                                    setup::launch(&directory)?;
                                    Ok("已打开配置窗口；保存时才会暂停当前保护。".into())
                                }
                                LOGIN => {
                                    let enabled = !install::autostart_enabled(&directory)?;
                                    install::autostart(&directory, enabled)?;
                                    Ok(if enabled {
                                        "已开启登录启动。"
                                    } else {
                                        "已关闭登录启动。"
                                    }
                                    .into())
                                }
                                PAUSE => {
                                    install::set_enabled(&directory, false)?;
                                    Ok("保护已暂停。".into())
                                }
                                RESUME => {
                                    install::set_enabled(&directory, true)?;
                                    Ok("恢复请求已保存，请查看实际保护状态。".into())
                                }
                                LOGS => {
                                    open_logs(&directory)?;
                                    Ok("已打开日志目录。".into())
                                }
                                BROWSER => {
                                    open_browser(&directory)?;
                                    Ok("已打开登记浏览器的扩展管理页。".into())
                                }
                                TEST => {
                                    notifications::test(&directory)?;
                                    Ok("通知已提交 Windows，请确认屏幕或通知中心显示。".into())
                                }
                                DIAGNOSE => {
                                    let doctor = install::doctor(&directory);
                                    let path = directory.join("diagnostics.json");
                                    storage::write_json(&path, &doctor)?;
                                    Ok(format!(
                                        "{}\n详细记录：{}",
                                        install::diagnostic_summary(&doctor),
                                        path.display()
                                    ))
                                }
                                EXIT => {
                                    install::stop(&directory)?;
                                    Ok("监控已停止。".into())
                                }
                                _ => Ok(String::new()),
                            }
                        })();
                        let _ = done.send(outcome.map_err(|e| e.to_string()));
                    });
                }
                _ => {}
            }
        }
        for outcome in result.try_iter() {
            busy = false;
            last_view.clear();
            text(
                feedback,
                &match outcome {
                    Ok(message) => message,
                    Err(error) => format!("{} {error}", friendly_error(&error)),
                },
            );
        }
        let mut message: MSG = unsafe { zeroed() };
        while unsafe { PeekMessageW(&mut message, null_mut(), 0, 0, PM_REMOVE) } != 0 {
            if unsafe { IsDialogMessageW(main, &message) } == 0
                && unsafe { IsDialogMessageW(countdown, &message) } == 0
            {
                unsafe {
                    TranslateMessage(&message);
                    DispatchMessageW(&message);
                }
            }
        }
        thread::sleep(Duration::from_millis(75));
    }
    drop(tray);
    let _ = storage::write_json(
        &directory.join("tray-status.json"),
        &json!({"registered":false,"stopped":true,"updatedAt":storage::timestamp()}),
    );
    let _ = storage::write_json(
        &directory.join("desktop-status.json"),
        &json!({"running":false,"stopped":true,"updatedAt":storage::timestamp()}),
    );
    unsafe {
        SetWindowLongPtrW(main, GWLP_USERDATA, 0);
        SetWindowLongPtrW(countdown, GWLP_USERDATA, 0);
        DestroyWindow(countdown);
        DestroyWindow(main);
    }
    Ok(())
}

pub fn open(directory: &Path) -> io::Result<Value> {
    if storage::read_config(directory).is_err() {
        return setup::launch(directory);
    }
    install::start(directory, false, true)?;
    daemon::request(directory, "show")
}
