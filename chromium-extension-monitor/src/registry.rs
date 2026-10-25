use crate::platform::wide;
use std::{
    io,
    ptr::{null, null_mut},
};
use windows_sys::Win32::{Foundation::ERROR_FILE_NOT_FOUND, System::Registry::*};

pub const VIEW64: u32 = KEY_WOW64_64KEY;
pub const VIEW32: u32 = KEY_WOW64_32KEY;
struct Key(HKEY);
impl Drop for Key {
    fn drop(&mut self) {
        unsafe {
            RegCloseKey(self.0);
        }
    }
}
fn error(code: u32) -> io::Error {
    io::Error::from_raw_os_error(code as i32)
}

pub fn read(key: &str, value: &str, view: u32) -> io::Result<Option<String>> {
    let mut handle = null_mut();
    let key = wide(key);
    let value = wide(value);
    let code = unsafe {
        RegOpenKeyExW(
            HKEY_CURRENT_USER,
            key.as_ptr(),
            0,
            KEY_READ | view,
            &mut handle,
        )
    };
    if code == ERROR_FILE_NOT_FOUND {
        return Ok(None);
    }
    if code != 0 {
        return Err(error(code));
    }
    let handle = Key(handle);
    let mut kind = 0;
    let mut length = 0;
    let code = unsafe {
        RegQueryValueExW(
            handle.0,
            value.as_ptr(),
            null(),
            &mut kind,
            null_mut(),
            &mut length,
        )
    };
    if code == ERROR_FILE_NOT_FOUND {
        return Ok(None);
    }
    if code != 0 {
        return Err(error(code));
    }
    if kind != REG_SZ || length % 2 != 0 {
        return Err(io::Error::other("registry value is not a valid REG_SZ"));
    }
    let mut data = vec![0u16; length as usize / 2];
    let code = unsafe {
        RegQueryValueExW(
            handle.0,
            value.as_ptr(),
            null(),
            &mut kind,
            data.as_mut_ptr().cast(),
            &mut length,
        )
    };
    if code != 0 {
        return Err(error(code));
    }
    while data.last() == Some(&0) {
        data.pop();
    }
    String::from_utf16(&data)
        .map(Some)
        .map_err(io::Error::other)
}

pub fn write(key: &str, value: &str, text: &str, view: u32) -> io::Result<()> {
    let mut handle = null_mut();
    let key = wide(key);
    let value = wide(value);
    let data = wide(text);
    let code = unsafe {
        RegCreateKeyExW(
            HKEY_CURRENT_USER,
            key.as_ptr(),
            0,
            null(),
            REG_OPTION_NON_VOLATILE,
            KEY_SET_VALUE | view,
            null(),
            &mut handle,
            null_mut(),
        )
    };
    if code != 0 {
        return Err(error(code));
    }
    let handle = Key(handle);
    let code = unsafe {
        RegSetValueExW(
            handle.0,
            value.as_ptr(),
            0,
            REG_SZ,
            data.as_ptr().cast(),
            (data.len() * 2) as u32,
        )
    };
    if code != 0 {
        return Err(error(code));
    }
    Ok(())
}

pub fn delete_key(key: &str, view: u32) -> io::Result<()> {
    let key = wide(key);
    let code = unsafe { RegDeleteKeyExW(HKEY_CURRENT_USER, key.as_ptr(), view, 0) };
    if code != 0 && code != ERROR_FILE_NOT_FOUND {
        return Err(error(code));
    }
    Ok(())
}
pub fn delete_value(key: &str, value: &str, view: u32) -> io::Result<()> {
    let mut handle = null_mut();
    let key = wide(key);
    let value = wide(value);
    let code = unsafe {
        RegOpenKeyExW(
            HKEY_CURRENT_USER,
            key.as_ptr(),
            0,
            KEY_SET_VALUE | view,
            &mut handle,
        )
    };
    if code == ERROR_FILE_NOT_FOUND {
        return Ok(());
    }
    if code != 0 {
        return Err(error(code));
    }
    let handle = Key(handle);
    let code = unsafe { RegDeleteValueW(handle.0, value.as_ptr()) };
    if code != 0 && code != ERROR_FILE_NOT_FOUND {
        return Err(error(code));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hkcu_unicode_default_value_roundtrips_without_console_encoding() {
        let key = format!(
            r"Software\BilibiliFocusMonitorTest-{}-{}",
            std::process::id(),
            crate::storage::timestamp()
        );
        assert!(read(&key, "", VIEW64).unwrap().is_none());
        write(&key, "", r"C:\中文 space\host.json", VIEW64).unwrap();
        assert_eq!(
            read(&key, "", VIEW64).unwrap().as_deref(),
            Some(r"C:\中文 space\host.json")
        );
        delete_key(&key, VIEW64).unwrap();
        assert!(read(&key, "", VIEW64).unwrap().is_none());
    }
}
