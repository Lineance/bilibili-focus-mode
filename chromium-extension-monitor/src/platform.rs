use crate::windows_runtime::security_descriptor;
use std::collections::HashMap;
use std::ffi::c_void;
use std::fs::File;
use std::io;
use std::mem::{size_of, zeroed};
use std::os::windows::io::FromRawHandle;
use std::ptr::null_mut;

use serde_json::{json, Value};
use windows_sys::Win32::Foundation::{
    CloseHandle, LocalFree, FILETIME, HANDLE, INVALID_HANDLE_VALUE,
};
use windows_sys::Win32::Storage::FileSystem::PIPE_ACCESS_DUPLEX;
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows_sys::Win32::System::Pipes::{
    ConnectNamedPipe, CreateNamedPipeW, GetNamedPipeClientProcessId, PIPE_REJECT_REMOTE_CLIENTS,
};
use windows_sys::Win32::System::Threading::{
    GetProcessTimes, OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows_sys::Win32::UI::Shell::CommandLineToArgvW;

#[link(name = "ntdll")]
unsafe extern "system" {
    fn NtQueryInformationProcess(
        process: HANDLE,
        class: u32,
        buffer: *mut c_void,
        length: u32,
        returned: *mut u32,
    ) -> i32;
}

#[repr(C)]
struct UnicodeString {
    length: u16,
    maximum_length: u16,
    buffer: *const u16,
}

pub(crate) struct Handle(pub(crate) HANDLE);
impl Drop for Handle {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}

pub fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}

pub fn accept_pipe(name: &str) -> io::Result<(File, u32)> {
    let name = wide(name);
    let descriptor = security_descriptor()?;
    let attributes = windows_sys::Win32::Security::SECURITY_ATTRIBUTES {
        nLength: size_of::<windows_sys::Win32::Security::SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: descriptor.0,
        bInheritHandle: 0,
    };
    let handle = unsafe {
        CreateNamedPipeW(
            name.as_ptr(),
            PIPE_ACCESS_DUPLEX,
            PIPE_REJECT_REMOTE_CLIENTS,
            255,
            65536,
            65536,
            0,
            &attributes,
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        return Err(io::Error::last_os_error());
    }
    let file = unsafe { File::from_raw_handle(handle) };
    let connected = unsafe { ConnectNamedPipe(handle, null_mut()) };
    if connected == 0 && io::Error::last_os_error().raw_os_error() != Some(535) {
        return Err(io::Error::last_os_error());
    }
    let mut pid = 0;
    if unsafe { GetNamedPipeClientProcessId(handle, &mut pid) } == 0 {
        return Err(io::Error::last_os_error());
    }
    Ok((file, pid))
}

pub fn processes() -> io::Result<HashMap<u32, (u32, String)>> {
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
    if snapshot == INVALID_HANDLE_VALUE {
        return Err(io::Error::last_os_error());
    }
    let snapshot = Handle(snapshot);
    let mut entry: PROCESSENTRY32W = unsafe { zeroed() };
    entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;
    let mut result = HashMap::new();
    let mut valid = unsafe { Process32FirstW(snapshot.0, &mut entry) };
    while valid != 0 {
        let length = entry
            .szExeFile
            .iter()
            .position(|x| *x == 0)
            .unwrap_or(entry.szExeFile.len());
        result.insert(
            entry.th32ProcessID,
            (
                entry.th32ParentProcessID,
                String::from_utf16_lossy(&entry.szExeFile[..length]),
            ),
        );
        valid = unsafe { Process32NextW(snapshot.0, &mut entry) };
    }
    Ok(result)
}

fn command_line(handle: HANDLE) -> io::Result<String> {
    let mut required = 0;
    unsafe {
        NtQueryInformationProcess(handle, 60, null_mut(), 0, &mut required);
    }
    if required < size_of::<UnicodeString>() as u32 || required > 1024 * 1024 {
        return Err(io::Error::other("cannot query process command line size"));
    }
    let mut buffer = vec![0u64; (required as usize).div_ceil(8)];
    if unsafe {
        NtQueryInformationProcess(
            handle,
            60,
            buffer.as_mut_ptr().cast(),
            required,
            &mut required,
        )
    } < 0
    {
        return Err(io::Error::other("cannot query process command line"));
    }
    let value = unsafe { &*buffer.as_ptr().cast::<UnicodeString>() };
    let start = value.buffer as usize;
    let base = buffer.as_ptr() as usize;
    if start < base
        || start + usize::from(value.length) > base + buffer.len() * 8
        || value.length % 2 != 0
    {
        return Err(io::Error::other("invalid command line buffer"));
    }
    Ok(String::from_utf16_lossy(unsafe {
        std::slice::from_raw_parts(value.buffer, value.length as usize / 2)
    }))
}

fn argv(text: &str) -> io::Result<Vec<String>> {
    let text = wide(text);
    let mut count = 0;
    let args = unsafe { CommandLineToArgvW(text.as_ptr(), &mut count) };
    if args.is_null() {
        return Err(io::Error::last_os_error());
    }
    let mut result = vec![];
    for i in 0..count as usize {
        let arg = unsafe { *args.add(i) };
        let mut length = 0;
        while unsafe { *arg.add(length) } != 0 {
            length += 1;
        }
        result.push(String::from_utf16_lossy(unsafe {
            std::slice::from_raw_parts(arg, length)
        }));
    }
    unsafe {
        LocalFree(args.cast());
    }
    Ok(result)
}

pub fn identity(pid: u32) -> io::Result<Value> {
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if handle.is_null() {
        return Err(io::Error::last_os_error());
    }
    let handle = Handle(handle);
    let mut path = vec![0u16; 32768];
    let mut length = path.len() as u32;
    if unsafe { QueryFullProcessImageNameW(handle.0, 0, path.as_mut_ptr(), &mut length) } == 0 {
        return Err(io::Error::last_os_error());
    }
    let mut creation: FILETIME = unsafe { zeroed() };
    let mut exit: FILETIME = unsafe { zeroed() };
    let mut kernel: FILETIME = unsafe { zeroed() };
    let mut user: FILETIME = unsafe { zeroed() };
    if unsafe { GetProcessTimes(handle.0, &mut creation, &mut exit, &mut kernel, &mut user) } == 0 {
        return Err(io::Error::last_os_error());
    }
    let args = argv(&command_line(handle.0)?)?;
    Ok(
        json!({"pid":pid,"exe":String::from_utf16_lossy(&path[..length as usize]),
        "created":((creation.dwHighDateTime as u64) << 32) | creation.dwLowDateTime as u64,
        "args":args}),
    )
}

pub fn normalized(path: &str) -> String {
    let canonical = std::fs::canonicalize(path).ok();
    let path = canonical
        .as_ref()
        .map(|p| p.to_string_lossy())
        .unwrap_or_else(|| path.into());
    path.trim_start_matches(r"\\?\")
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_lowercase()
}

pub fn matches_target(info: &Value, browser: &str, profile: &str) -> bool {
    if normalized(info["exe"].as_str().unwrap_or("")) != normalized(browser) {
        return false;
    }
    let Some(args) = info["args"].as_array() else {
        return false;
    };
    if args
        .iter()
        .any(|arg| arg.as_str().is_some_and(|x| x.starts_with("--type=")))
    {
        return false;
    }
    for (index, arg) in args.iter().enumerate() {
        let arg = arg.as_str().unwrap_or("");
        let value = arg.strip_prefix("--user-data-dir=").or_else(|| {
            if arg == "--user-data-dir" {
                args.get(index + 1).and_then(Value::as_str)
            } else {
                None
            }
        });
        if value.is_some_and(|value| normalized(value) == normalized(profile)) {
            return true;
        }
    }
    false
}

pub fn matches_registered(info: &Value, target: &crate::config::Target) -> bool {
    if matches_target(
        info,
        &target.browser_path.to_string_lossy(),
        &target.user_data_dir.to_string_lossy(),
    ) {
        return true;
    }
    target.allow_default_profile
        && normalized(info["exe"].as_str().unwrap_or(""))
            == normalized(&target.browser_path.to_string_lossy())
        && info["args"].as_array().is_some_and(|args| {
            !args.iter().any(|arg| {
                arg.as_str()
                    .is_some_and(|a| a.starts_with("--type=") || a.starts_with("--user-data-dir"))
            })
        })
}

pub fn instance(info: &Value) -> io::Result<crate::engine::InstanceId> {
    Ok(crate::engine::InstanceId {
        pid: info["pid"]
            .as_u64()
            .ok_or_else(|| io::Error::other("missing PID"))? as u32,
        created: info["created"]
            .as_u64()
            .ok_or_else(|| io::Error::other("missing creation time"))?,
    })
}

pub fn ancestors(pid: u32) -> io::Result<Vec<Value>> {
    let entries = processes()?;
    let mut chain = vec![];
    let mut current = pid;
    for _ in 0..16 {
        let Some((parent, name)) = entries.get(&current) else {
            break;
        };
        chain.push(json!({"pid":current,"parent":parent,"name":name}));
        if *parent == 0 || *parent == current {
            break;
        }
        current = *parent;
    }
    Ok(chain)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_exact_executable_and_unicode_profile_path() {
        let process = json!({"exe":r"C:\Browser\chrome.exe", "args":[
            "chrome.exe", "--user-data-dir=D:/测试目录/profile space"]});
        assert!(matches_target(
            &process,
            r"c:\browser\CHROME.exe",
            r"D:\测试目录\profile space"
        ));
    }

    #[test]
    fn does_not_enroll_another_data_directory_or_a_renderer() {
        let process = json!({"exe":r"C:\Browser\chrome.exe", "args":[
            "chrome.exe", "--user-data-dir=D:/target", "--type=renderer"]});
        assert!(!matches_target(
            &process,
            r"C:\Browser\chrome.exe",
            "D:/target"
        ));
        let process = json!({"exe":r"C:\Browser\chrome.exe", "args":[
            "chrome.exe", "--user-data-dir=D:/other"]});
        assert!(!matches_target(
            &process,
            r"C:\Browser\chrome.exe",
            "D:/target"
        ));
    }

    #[test]
    fn does_not_match_another_browser_installation_with_the_same_name() {
        let process = json!({"exe":r"C:\Other\chrome.exe", "args":[
            "chrome.exe", "--user-data-dir=D:/target"]});
        assert!(!matches_target(
            &process,
            r"C:\Browser\chrome.exe",
            "D:/target"
        ));
    }

    #[test]
    fn parses_quoted_command_line_and_separate_data_directory_argument() {
        let args =
            argv(r#""C:\Browser Path\chrome.exe" --user-data-dir "D:\中文 profile""#).unwrap();
        let process = json!({"exe":r"C:\Browser Path\chrome.exe", "args":args});
        assert!(matches_target(
            &process,
            r"C:\Browser Path\chrome.exe",
            r"D:\中文 profile"
        ));
    }
}
