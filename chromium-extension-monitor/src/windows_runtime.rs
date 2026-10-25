use crate::{
    config::Target,
    engine::InstanceId,
    platform::{self, wide, Handle},
};
use std::{
    collections::HashSet,
    ffi::c_void,
    io,
    mem::zeroed,
    path::Path,
    ptr::{null, null_mut},
};
use windows_sys::Win32::{
    Foundation::{GetLastError, LocalFree, ERROR_ALREADY_EXISTS, FILETIME, HWND, LPARAM},
    Security::{
        Authorization::{
            ConvertSidToStringSidW, ConvertStringSecurityDescriptorToSecurityDescriptorW,
            SDDL_REVISION_1,
        },
        GetTokenInformation, TokenUser, TOKEN_QUERY, TOKEN_USER,
    },
    Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH},
    System::{
        SystemInformation::GetTickCount64,
        Threading::{
            CreateMutexW, GetCurrentProcess, GetProcessTimes, OpenProcess, OpenProcessToken,
            TerminateProcess, WaitForSingleObject, PROCESS_QUERY_LIMITED_INFORMATION,
            PROCESS_TERMINATE,
        },
        WindowsProgramming::QueryUnbiasedInterruptTime,
    },
    UI::WindowsAndMessaging::{EnumWindows, GetWindowThreadProcessId, PostMessageW, WM_CLOSE},
};

pub struct SecurityDescriptor(pub *mut c_void);
impl Drop for SecurityDescriptor {
    fn drop(&mut self) {
        unsafe {
            LocalFree(self.0);
        }
    }
}

pub fn current_sid() -> io::Result<String> {
    let mut token = null_mut();
    if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) } == 0 {
        return Err(io::Error::last_os_error());
    }
    let token = Handle(token);
    let mut length = 0;
    unsafe {
        GetTokenInformation(token.0, TokenUser, null_mut(), 0, &mut length);
    }
    let mut buffer = vec![0u64; (length as usize).div_ceil(8)];
    if unsafe {
        GetTokenInformation(
            token.0,
            TokenUser,
            buffer.as_mut_ptr().cast(),
            length,
            &mut length,
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    let user = unsafe { &*buffer.as_ptr().cast::<TOKEN_USER>() };
    let mut sid = null_mut();
    if unsafe { ConvertSidToStringSidW(user.User.Sid, &mut sid) } == 0 {
        return Err(io::Error::last_os_error());
    }
    let mut length = 0;
    while unsafe { *sid.add(length) } != 0 {
        length += 1;
    }
    let text = String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(sid, length) });
    unsafe {
        LocalFree(sid.cast());
    }
    Ok(text)
}

pub fn security_descriptor() -> io::Result<SecurityDescriptor> {
    let sddl = wide(&format!("D:P(A;;GA;;;{})", current_sid()?));
    let mut descriptor = null_mut();
    if unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            sddl.as_ptr(),
            SDDL_REVISION_1,
            &mut descriptor,
            null_mut(),
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    Ok(SecurityDescriptor(descriptor))
}

pub struct InstanceLock(Handle);
impl InstanceLock {
    pub fn acquire(name: &str) -> io::Result<Self> {
        let name = wide(name);
        let handle = unsafe { CreateMutexW(null(), 0, name.as_ptr()) };
        if handle.is_null() {
            return Err(io::Error::last_os_error());
        }
        let error = unsafe { GetLastError() };
        let handle = Handle(handle);
        if error == ERROR_ALREADY_EXISTS {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                "watchdog is already running",
            ));
        }
        Ok(Self(handle))
    }
    pub fn is_held(&self) -> bool {
        !self.0 .0.is_null()
    }
}

pub fn replace_file(from: &Path, to: &Path) -> io::Result<()> {
    let from = wide(&from.to_string_lossy());
    let to = wide(&to.to_string_lossy());
    if unsafe {
        MoveFileExW(
            from.as_ptr(),
            to.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    Ok(())
}

pub fn active_time() -> io::Result<u64> {
    let mut time = 0;
    if unsafe { QueryUnbiasedInterruptTime(&mut time) } == 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(time / 10_000)
}
pub fn uptime() -> u64 {
    unsafe { GetTickCount64() }
}

fn open_verified(id: &InstanceId, target: &Target, terminate: bool) -> io::Result<Option<Handle>> {
    let handle = unsafe {
        OpenProcess(
            PROCESS_QUERY_LIMITED_INFORMATION
                | 0x00100000
                | if terminate { PROCESS_TERMINATE } else { 0 },
            0,
            id.pid,
        )
    };
    if handle.is_null() {
        let error = io::Error::last_os_error();
        if error.raw_os_error() == Some(87) {
            return Ok(None);
        }
        return Err(error);
    }
    let handle = Handle(handle);
    if unsafe { WaitForSingleObject(handle.0, 0) } == 0 {
        return Ok(None);
    }
    let mut creation: FILETIME = unsafe { zeroed() };
    let mut exit = creation;
    let mut kernel = creation;
    let mut user = creation;
    if unsafe { GetProcessTimes(handle.0, &mut creation, &mut exit, &mut kernel, &mut user) } == 0 {
        return Err(io::Error::last_os_error());
    }
    let created = ((creation.dwHighDateTime as u64) << 32) | creation.dwLowDateTime as u64;
    if created != id.created {
        return Err(io::Error::other(
            "PID was reused; refusing to close the replacement process",
        ));
    }
    let info = platform::identity(id.pid)?;
    if platform::instance(&info)? != *id || !platform::matches_registered(&info, target) {
        return Err(io::Error::other("browser identity changed before close"));
    }
    Ok(Some(handle))
}

unsafe extern "system" fn close_window(hwnd: HWND, data: LPARAM) -> i32 {
    let mut pid = 0;
    unsafe {
        GetWindowThreadProcessId(hwnd, &mut pid);
    }
    if pid == data as u32 {
        unsafe {
            PostMessageW(hwnd, WM_CLOSE, 0, 0);
        }
    }
    1
}

pub fn request_close(id: &InstanceId, target: &Target) -> io::Result<()> {
    let Some(_handle) = open_verified(id, target, false)? else {
        return Ok(());
    };
    if unsafe { EnumWindows(Some(close_window), id.pid as LPARAM) } == 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(())
}

/// Pin handles and creation times before closing the root. Never kill by image
/// name and never let a recycled PID become an implicit new target.
pub fn terminate(id: &InstanceId, target: &Target) -> io::Result<Vec<u32>> {
    let Some(root) = open_verified(id, target, true)? else {
        return Ok(vec![]);
    };
    let entries = platform::processes()?;
    let mut descendants = HashSet::from([id.pid]);
    loop {
        let before = descendants.len();
        for (pid, (parent, _)) in &entries {
            if descendants.contains(parent) {
                descendants.insert(*pid);
            }
        }
        if descendants.len() == before {
            break;
        }
    }
    let mut children = vec![];
    for pid in descendants.into_iter().filter(|pid| *pid != id.pid) {
        let Ok(info) = platform::identity(pid) else {
            continue;
        };
        if platform::normalized(info["exe"].as_str().unwrap_or(""))
            != platform::normalized(&target.browser_path.to_string_lossy())
        {
            continue;
        }
        let child_id = platform::instance(&info)?;
        if child_id.created < id.created {
            continue;
        }
        let handle = unsafe {
            OpenProcess(
                PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_TERMINATE | 0x00100000,
                0,
                pid,
            )
        };
        if handle.is_null() {
            continue;
        }
        let handle = Handle(handle);
        // identity() checks a second snapshot while this handle pins the object.
        if platform::identity(pid)
            .ok()
            .and_then(|info| platform::instance(&info).ok())
            != Some(child_id)
        {
            continue;
        }
        children.push((pid, handle));
    }
    let mut terminated = vec![];
    for (pid, handle) in std::iter::once((id.pid, root)).chain(children) {
        if unsafe { WaitForSingleObject(handle.0, 0) } == 0 {
            continue;
        }
        if unsafe { TerminateProcess(handle.0, 1) } == 0
            && unsafe { WaitForSingleObject(handle.0, 0) } != 0
        {
            return Err(io::Error::last_os_error());
        }
        if unsafe { WaitForSingleObject(handle.0, 2000) } != 0 {
            return Err(io::Error::other(format!("process {pid} did not exit")));
        }
        terminated.push(pid);
    }
    Ok(terminated)
}

pub fn spawn_detached(command: &mut std::process::Command) -> io::Result<std::process::Child> {
    use windows_sys::Win32::{
        Foundation::{GetHandleInformation, SetHandleInformation, HANDLE_FLAG_INHERIT},
        System::Console::{GetStdHandle, STD_ERROR_HANDLE, STD_INPUT_HANDLE, STD_OUTPUT_HANDLE},
    };
    struct Restore(Vec<(windows_sys::Win32::Foundation::HANDLE, u32)>);
    impl Drop for Restore {
        fn drop(&mut self) {
            for (handle, flags) in &self.0 {
                unsafe {
                    SetHandleInformation(
                        *handle,
                        HANDLE_FLAG_INHERIT,
                        *flags & HANDLE_FLAG_INHERIT,
                    );
                }
            }
        }
    }
    let mut restore = Restore(vec![]);
    for kind in [STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, STD_ERROR_HANDLE] {
        let handle = unsafe { GetStdHandle(kind) };
        let mut flags = 0;
        if unsafe { GetHandleInformation(handle, &mut flags) } != 0 {
            if unsafe { SetHandleInformation(handle, HANDLE_FLAG_INHERIT, 0) } == 0 {
                return Err(io::Error::last_os_error());
            }
            restore.0.push((handle, flags));
        }
    }
    command.spawn()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        os::windows::process::CommandExt,
        process::{Command, Stdio},
    };
    use std::{thread, time::Duration};
    #[test]
    fn helper_wait() {
        if std::env::var_os("BILIBILI_TEST_CHILD").is_some() {
            thread::sleep(Duration::from_secs(60));
        }
    }
    #[test]
    fn refuses_recycled_identity_then_terminates_only_the_pinned_test_child() {
        struct Cleanup(std::process::Child);
        impl Drop for Cleanup {
            fn drop(&mut self) {
                let _ = self.0.kill();
                let _ = self.0.wait();
            }
        }
        let executable = std::env::current_exe().unwrap();
        let child = Command::new(&executable)
            .args(["--exact", "windows_runtime::tests::helper_wait"])
            .env("BILIBILI_TEST_CHILD", "1")
            .creation_flags(0x08000000)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        let mut child = Cleanup(child);
        let id = platform::instance(&platform::identity(child.0.id()).unwrap()).unwrap();
        let target = Target {
            browser_path: executable,
            user_data_dir: std::env::temp_dir(),
            extension_id: "abcdefghijklmnopabcdefghijklmnop".into(),
            registry_browser: "chrome".into(),
            allow_default_profile: true,
        };
        let wrong = InstanceId {
            created: id.created + 1,
            ..id.clone()
        };
        assert!(terminate(&wrong, &target).is_err());
        assert!(child.0.try_wait().unwrap().is_none());
        assert!(terminate(&id, &target).unwrap().contains(&id.pid));
        assert!(!child.0.wait().unwrap().success());
    }
}
