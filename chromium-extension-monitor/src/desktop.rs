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
    Foundation::{HWND, LPARAM, LRESULT, WPARAM},
    Graphics::Gdi::{GetStockObject, COLOR_WINDOW, DEFAULT_GUI_FONT},
    System::LibraryLoader::GetModuleHandleW,
    UI::WindowsAndMessaging::*,
};

const PAUSE: u16 = 101;
const RESUME: u16 = 102;
const DIAGNOSE: u16 = 103;
const LOGS: u16 = 104;
const TEST: u16 = 105;
const BROWSER: u16 = 106;
const EXIT: u16 = 107;
enum Command {
    Click(u16),
    Close(HWND),
}
unsafe extern "system" fn window_proc(
    hwnd: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    let sender = unsafe { GetWindowLongPtrW(hwnd, GWLP_USERDATA) } as *const mpsc::Sender<Command>;
    if !sender.is_null() {
        let command = match message {
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
        hIcon: unsafe { LoadIconW(null_mut(), IDI_SHIELD) },
        hbrBackground: (COLOR_WINDOW + 1) as _,
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
            width,
            height,
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
    let class = wide(class);
    let text = wide(text);
    let hwnd = unsafe {
        CreateWindowExW(
            0,
            class.as_ptr(),
            text.as_ptr(),
            WS_CHILD | WS_VISIBLE | style,
            x,
            y,
            w,
            h,
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
            GetStockObject(DEFAULT_GUI_FONT) as usize,
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

pub fn start(directory: PathBuf, status: Arc<Mutex<Value>>, show: Arc<AtomicBool>) {
    thread::spawn(move || {
        if let Err(error) = run(&directory, status, show) {
            let _ = storage::write_json(
                &directory.join("desktop-status.json"),
                &json!({"running":false,"error":error.to_string()}),
            );
            show_error("专注守护界面启动失败", &error.to_string());
        }
    });
}

fn run(directory: &Path, status: Arc<Mutex<Value>>, show: Arc<AtomicBool>) -> io::Result<()> {
    let _apartment = notifications::Apartment::new()?;
    let (sender, commands) = mpsc::channel();
    let main = window("Bilibili 专注守护", 640, 380, &sender, false)?;
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
    let feedback = control(
        main,
        "STATIC",
        "关闭此窗口不会暂停保护。",
        0,
        20,
        290,
        590,
        40,
        0,
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
                                        "{} 诊断已保存到 {}",
                                        if doctor["ok"] == true {
                                            "检查通过。"
                                        } else {
                                            "检查未通过，请查看日志目录中的 diagnostics.json。"
                                        },
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
    unsafe {
        SetWindowLongPtrW(main, GWLP_USERDATA, 0);
        SetWindowLongPtrW(countdown, GWLP_USERDATA, 0);
        DestroyWindow(countdown);
        DestroyWindow(main);
    }
    Ok(())
}

pub fn open(directory: &Path) -> io::Result<Value> {
    install::start(directory, false, true)?;
    daemon::request(directory, "show")
}
