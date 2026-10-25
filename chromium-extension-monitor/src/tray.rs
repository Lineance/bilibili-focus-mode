use crate::{desktop::describe, platform::wide};
use serde_json::Value;
use std::{
    io,
    mem::{size_of, zeroed},
    ptr::{null, null_mut},
};
use windows_sys::Win32::{
    Foundation::{HWND, POINT},
    UI::{
        Shell::{
            Shell_NotifyIconW, NIF_ICON, NIF_MESSAGE, NIF_TIP, NIM_ADD, NIM_DELETE, NIM_MODIFY,
            NOTIFYICONDATAW,
        },
        WindowsAndMessaging::*,
    },
};

pub const CALLBACK: u32 = WM_APP + 42;
pub const SHOW: u16 = 108;
pub const PAUSE: u16 = 101;
pub const RESUME: u16 = 102;
pub const DIAGNOSE: u16 = 103;
pub const LOGS: u16 = 104;
pub const TEST: u16 = 105;
pub const BROWSER: u16 = 106;
pub const EXIT: u16 = 107;

pub struct Tray {
    data: NOTIFYICONDATAW,
    added: bool,
    last: String,
}
impl Tray {
    pub fn new(hwnd: HWND) -> Self {
        let mut data: NOTIFYICONDATAW = unsafe { zeroed() };
        data.cbSize = size_of::<NOTIFYICONDATAW>() as u32;
        data.hWnd = hwnd;
        data.uID = 1;
        data.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
        data.uCallbackMessage = CALLBACK;
        Self {
            data,
            added: false,
            last: String::new(),
        }
    }
    pub fn reset(&mut self) {
        self.added = false;
        self.last.clear();
    }
    pub fn update(&mut self, status: &Value) -> io::Result<bool> {
        let label = describe(status);
        if self.added && self.last == label {
            return Ok(true);
        }
        let icon = if status["state"] == "faulted" || status["state"] == "gracePeriod" {
            IDI_WARNING
        } else if status["enabled"] == true {
            IDI_SHIELD
        } else {
            IDI_INFORMATION
        };
        self.data.hIcon = unsafe { LoadIconW(null_mut(), icon) };
        self.data.szTip.fill(0);
        for (place, value) in self
            .data
            .szTip
            .iter_mut()
            .zip(wide(&format!("Bilibili 专注守护 · {label}")))
        {
            *place = value;
        }
        self.data.szTip[127] = 0;
        if unsafe { Shell_NotifyIconW(if self.added { NIM_MODIFY } else { NIM_ADD }, &self.data) }
            == 0
        {
            return Err(io::Error::other(
                "Windows tray registration failed; use the Start Menu shortcut to open status",
            ));
        }
        self.added = true;
        self.last = label;
        Ok(true)
    }
    pub fn menu(&self, status: &Value) -> Option<u16> {
        let menu = unsafe { CreatePopupMenu() };
        if menu.is_null() {
            return None;
        }
        let title = wide(&describe(status));
        unsafe {
            AppendMenuW(menu, MF_STRING | MF_DISABLED, 0, title.as_ptr());
            AppendMenuW(menu, MF_SEPARATOR, 0, null());
        }
        for (id, label, enabled) in [
            (SHOW, "打开状态窗口", true),
            (PAUSE, "暂停保护", status["enabled"] == true),
            (
                RESUME,
                "恢复保护",
                status["enabled"] != true
                    && status["verified"] == true
                    && status["state"] != "faulted",
            ),
            (BROWSER, "打开扩展管理页", true),
            (DIAGNOSE, "运行诊断", true),
            (TEST, "测试系统通知", true),
            (LOGS, "打开日志目录", true),
            (EXIT, "停止保护并退出", true),
        ] {
            let label = wide(label);
            unsafe {
                AppendMenuW(
                    menu,
                    MF_STRING | if enabled { 0 } else { MF_DISABLED },
                    id as usize,
                    label.as_ptr(),
                );
            }
        }
        let mut point = POINT { x: 0, y: 0 };
        unsafe {
            GetCursorPos(&mut point);
            SetForegroundWindow(self.data.hWnd);
        }
        let selected = unsafe {
            TrackPopupMenu(
                menu,
                TPM_RETURNCMD | TPM_RIGHTBUTTON,
                point.x,
                point.y,
                0,
                self.data.hWnd,
                null(),
            )
        };
        unsafe {
            DestroyMenu(menu);
            PostMessageW(self.data.hWnd, WM_NULL, 0, 0);
        }
        if selected > 0 {
            Some(selected as u16)
        } else {
            None
        }
    }
}
impl Drop for Tray {
    fn drop(&mut self) {
        if self.added {
            unsafe {
                Shell_NotifyIconW(NIM_DELETE, &self.data);
            }
        }
    }
}
