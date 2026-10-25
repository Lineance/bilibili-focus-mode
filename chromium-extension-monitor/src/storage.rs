use crate::{config::Config, platform};
use serde::{de::DeserializeOwned, Serialize};
use std::{
    collections::hash_map::DefaultHasher,
    fs::{self, File, OpenOptions},
    hash::{Hash, Hasher},
    io::{self, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

pub fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub fn data_dir(override_dir: Option<PathBuf>) -> io::Result<PathBuf> {
    if let Some(path) =
        override_dir.or_else(|| std::env::var_os("BILIBILI_FOCUS_MONITOR_DIR").map(PathBuf::from))
    {
        return Ok(path);
    }
    if let Some(bin) = std::env::current_exe()?.parent() {
        if bin.file_name().is_some_and(|name| name == "bin") {
            if let Some(root) = bin.parent() {
                return Ok(root.to_owned());
            }
        }
    }
    Ok(PathBuf::from(
        std::env::var_os("LOCALAPPDATA")
            .ok_or_else(|| io::Error::other("LOCALAPPDATA is unavailable"))?,
    )
    .join("BilibiliFocusMonitor"))
}

pub fn pipe_name(directory: &Path) -> String {
    let mut hasher = DefaultHasher::new();
    platform::normalized(&directory.to_string_lossy()).hash(&mut hasher);
    format!(r"\\.\pipe\bilibili-focus-monitor-{:016x}", hasher.finish())
}

pub fn read_json<T: DeserializeOwned>(path: &Path) -> io::Result<T> {
    serde_json::from_slice(&fs::read(path)?).map_err(io::Error::other)
}

pub fn read_config(directory: &Path) -> io::Result<Config> {
    let config: Config = read_json(&directory.join("config.json"))?;
    config.validate()?;
    Ok(config)
}

/// Replace a complete file atomically, including on Windows where rename does
/// not replace an existing destination. No half-written config can arm a timer.
pub fn write_json(path: &Path, value: &impl Serialize) -> io::Result<()> {
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::other("missing parent directory"))?;
    fs::create_dir_all(parent)?;
    let temp = parent.join(format!(
        ".{}-{}-{}.tmp",
        path.file_name().unwrap_or_default().to_string_lossy(),
        std::process::id(),
        timestamp()
    ));
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temp)?;
    file.write_all(&serde_json::to_vec_pretty(value)?)?;
    file.sync_all()?;
    drop(file);
    let result = crate::windows_runtime::replace_file(&temp, path);
    if result.is_err() {
        let _ = fs::remove_file(temp);
    }
    result
}

pub struct EventLog {
    path: PathBuf,
    file: Option<File>,
}
impl EventLog {
    pub fn new(directory: &Path) -> io::Result<Self> {
        fs::create_dir_all(directory)?;
        let path = directory.join("events.jsonl");
        let file = OpenOptions::new().create(true).append(true).open(&path)?;
        Ok(Self {
            path,
            file: Some(file),
        })
    }
    pub fn record(&mut self, mut value: serde_json::Value) -> io::Result<()> {
        if self
            .file
            .as_ref()
            .ok_or_else(|| io::Error::other("log is closed"))?
            .metadata()?
            .len()
            > 2 * 1024 * 1024
        {
            self.file.take();
            let backup = self.path.with_extension("previous.jsonl");
            if backup.exists() {
                fs::remove_file(&backup)?;
            }
            fs::rename(&self.path, backup)?;
            self.file = Some(
                OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&self.path)?,
            );
        }
        value["timestamp"] = timestamp().into();
        let file = self
            .file
            .as_mut()
            .ok_or_else(|| io::Error::other("log is closed"))?;
        let mut bytes = serde_json::to_vec(&value)?;
        bytes.push(b'\n');
        file.write_all(&bytes)?;
        file.flush()
    }
}
