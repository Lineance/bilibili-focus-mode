use crate::{
    config::{Config, Target, Timing, HOST_NAME},
    daemon, platform,
    registry::{self, VIEW32, VIEW64},
    storage,
};
use serde_json::{json, Value};
use std::{
    fs, io,
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};
const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const BINARIES: [&str; 3] = [
    "monitor.exe",
    "bilibili-focus-host.exe",
    "bilibili-focus-watchdog.exe",
];

pub fn registry_key(target: &Target) -> String {
    let vendor = if target.registry_browser == "chromium" {
        "Chromium"
    } else {
        r"Google\Chrome"
    };
    format!(r"Software\{vendor}\NativeMessagingHosts\{HOST_NAME}")
}
fn manifest_path(directory: &Path) -> PathBuf {
    directory.join(format!("{HOST_NAME}.json"))
}
fn startup_name(directory: &Path) -> String {
    storage::pipe_name(directory).replace(r"\\.\pipe\", "")
}
fn startup_command(directory: &Path) -> String {
    format!(
        "\"{}\"",
        directory.join("bin/bilibili-focus-watchdog.exe").display()
    )
}

pub fn autostart(directory: &Path, enabled: bool) -> io::Result<()> {
    if enabled {
        let executable = directory.join("bin/bilibili-focus-watchdog.exe");
        if !executable.is_file() {
            return Err(io::Error::other(
                "install the watchdog before enabling login startup",
            ));
        }
        let expected = startup_command(directory);
        if registry::read(RUN_KEY, &startup_name(directory), VIEW64)?
            .is_some_and(|value| value != expected)
        {
            return Err(io::Error::other(
                "startup entry belongs to another installation",
            ));
        }
        registry::write(RUN_KEY, &startup_name(directory), &expected, VIEW64)?;
        if registry::read(RUN_KEY, &startup_name(directory), VIEW64)?.as_deref() != Some(&expected)
        {
            return Err(io::Error::other("startup registration readback failed"));
        }
    } else if registry::read(RUN_KEY, &startup_name(directory), VIEW64)?.as_deref()
        == Some(&startup_command(directory))
    {
        registry::delete_value(RUN_KEY, &startup_name(directory), VIEW64)?;
    }
    Ok(())
}

/// Installs disabled. Existing registrations owned by another directory or view
/// are never overwritten. Rollback covers files and the registry default value.
pub fn install(directory: &Path, mut target: Target, login_start: bool) -> io::Result<Value> {
    if !crate::config::valid_extension_id(&target.extension_id) {
        return Err(io::Error::other(
            "extension ID must be exactly 32 letters a-p",
        ));
    }
    target.browser_path = platform::plain_path(&fs::canonicalize(&target.browser_path)?);
    if !target.browser_path.is_file() {
        return Err(io::Error::other("browser executable is not a file"));
    }
    fs::create_dir_all(&target.user_data_dir)?;
    target.user_data_dir = platform::plain_path(&fs::canonicalize(&target.user_data_dir)?);
    let config = Config {
        version: 1,
        target,
        enabled: false,
        timing: Timing::default(),
    };
    config.validate()?;
    if directory.join("config.json").exists()
        && storage::read_config(directory)?.target.registry_browser
            != config.target.registry_browser
    {
        return Err(io::Error::other(
            "uninstall the previous browser registration before changing registryBrowser",
        ));
    }
    if daemon::request(directory, "status").is_ok() {
        return Err(io::Error::other(
            "stop the existing watchdog before installing or updating",
        ));
    }
    let manifest_path = manifest_path(directory);
    let expected = manifest_path.to_string_lossy().into_owned();
    let key = registry_key(&config.target);
    for view in [VIEW32, VIEW64] {
        if registry::read(&key, "", view)?
            .is_some_and(|value| platform::normalized(&value) != platform::normalized(&expected))
        {
            return Err(io::Error::other("a native host registration already belongs to another installation; uninstall it first"));
        }
    }
    let previous_registration = registry::read(&key, "", VIEW64)?;
    let previous_startup = registry::read(RUN_KEY, &startup_name(directory), VIEW64)?;
    let source = std::env::current_exe()?
        .parent()
        .ok_or_else(|| io::Error::other("cannot find distribution directory"))?
        .to_owned();
    let bin = directory.join("bin");
    fs::create_dir_all(&bin)?;
    let paths: Vec<PathBuf> = BINARIES
        .iter()
        .map(|name| bin.join(name))
        .chain([directory.join("config.json"), manifest_path.clone()])
        .collect();
    let mut backups = vec![];
    for path in &paths {
        backups.push((
            path.clone(),
            if path.exists() {
                Some(fs::read(path)?)
            } else {
                None
            },
        ));
    }
    let result = (|| -> io::Result<()> {
        for name in BINARIES {
            let destination = bin.join(name);
            let origin = source.join(name);
            if !origin.is_file() {
                return Err(io::Error::other(format!(
                    "distribution is missing {name}; build all binaries"
                )));
            }
            if platform::normalized(&origin.to_string_lossy())
                != platform::normalized(&destination.to_string_lossy())
            {
                storage::write_bytes(&destination, &fs::read(origin)?)?;
            }
        }
        storage::write_json(&directory.join("config.json"), &config)?;
        storage::write_json(
            &manifest_path,
            &json!({"name":HOST_NAME,"description":"Bilibili Focus Mode watchdog bridge","path":bin.join("bilibili-focus-host.exe"),"type":"stdio","allowed_origins":[format!("chrome-extension://{}/",config.target.extension_id)]}),
        )?;
        registry::write(&key, "", &expected, VIEW64)?;
        if registry::read(&key, "", VIEW64)?.as_deref() != Some(&expected) {
            return Err(io::Error::other("host registration readback failed"));
        }
        if login_start {
            autostart(directory, true)?;
        }
        Ok(())
    })();
    if let Err(error) = result {
        let mut rollback_errors = vec![];
        if login_start {
            let restored = if let Some(value) = previous_startup {
                registry::write(RUN_KEY, &startup_name(directory), &value, VIEW64)
            } else {
                registry::delete_value(RUN_KEY, &startup_name(directory), VIEW64)
            };
            if let Err(error) = restored {
                rollback_errors.push(error.to_string());
            }
        }
        let registry_restore = if let Some(value) = previous_registration {
            registry::write(&key, "", &value, VIEW64)
        } else {
            registry::delete_key(&key, VIEW64)
        };
        if let Err(error) = registry_restore {
            rollback_errors.push(error.to_string());
        }
        for (path, bytes) in backups.into_iter().rev() {
            let restored = if let Some(bytes) = bytes {
                storage::write_bytes(&path, &bytes)
            } else if path.exists() {
                fs::remove_file(path)
            } else {
                Ok(())
            };
            if let Err(error) = restored {
                rollback_errors.push(error.to_string());
            }
        }
        return Err(io::Error::other(format!(
            "install failed: {error}; rollback errors: {}",
            rollback_errors.join("; ")
        )));
    }
    Ok(
        json!({"installed":true,"enabled":false,"dataDir":directory,"autostart":login_start,"next":"start watchdog, enable extension communication, run doctor, then enable protection"}),
    )
}

pub fn start(directory: &Path, dry_run: bool, notify: bool) -> io::Result<Value> {
    if let Ok(status) = daemon::request(directory, "status") {
        return Ok(status);
    }
    storage::read_config(directory)?;
    let binary = directory.join("bin/bilibili-focus-watchdog.exe");
    let log = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(directory.join("startup.log"))?;
    let mut command = Command::new(binary);
    command
        .arg("--data-dir")
        .arg(directory)
        .creation_flags(0x08000000)
        .stdin(Stdio::null())
        .stdout(log.try_clone()?)
        .stderr(log);
    if dry_run {
        command.arg("--dry-run");
    }
    if !notify {
        command.arg("--no-notify");
    }
    let mut child = crate::windows_runtime::spawn_detached(&mut command)?;
    let deadline = Instant::now() + Duration::from_secs(5);
    while Instant::now() < deadline {
        if let Ok(status) = daemon::request(directory, "status") {
            if status["watchdogRunning"] == true {
                return Ok(status);
            }
        }
        if child.try_wait()?.is_some() {
            return Err(io::Error::other(
                "watchdog exited during startup; inspect startup.log/startup-error.txt",
            ));
        }
        thread::sleep(Duration::from_millis(100));
    }
    Err(io::Error::other(
        "watchdog did not become ready within five seconds",
    ))
}

pub fn set_enabled(directory: &Path, enabled: bool) -> io::Result<Value> {
    let mut config = storage::read_config(directory)?;
    if enabled {
        let status = daemon::request(directory, "status")?;
        if status["verified"] != true || status["state"] == "faulted" {
            return Err(io::Error::other(
                "complete a native handshake and resolve doctor errors before enabling protection",
            ));
        }
    }
    config.enabled = enabled;
    storage::write_json(&directory.join("config.json"), &config)?;
    Ok(json!({"enabled":enabled}))
}

pub fn stop(directory: &Path) -> io::Result<Value> {
    if directory.join("config.json").exists() {
        set_enabled(directory, false)?;
    }
    match daemon::request(directory, "stop") {
        Ok(_) => {
            let deadline = Instant::now() + Duration::from_secs(5);
            while Instant::now() < deadline {
                if daemon::request(directory, "status").is_err() {
                    return Ok(json!({"stopped":true,"enabled":false}));
                }
                thread::sleep(Duration::from_millis(100));
            }
            Err(io::Error::other("watchdog did not stop"))
        }
        Err(error) if error.raw_os_error() == Some(2) => {
            Ok(json!({"stopped":true,"enabled":false}))
        }
        Err(error) => Err(error),
    }
}

pub fn uninstall(directory: &Path) -> io::Result<Value> {
    let config = storage::read_config(directory)?;
    stop(directory)?;
    autostart(directory, false)?;
    let expected = manifest_path(directory).to_string_lossy().into_owned();
    let key = registry_key(&config.target);
    for view in [VIEW32, VIEW64] {
        if registry::read(&key, "", view)?
            .is_some_and(|value| platform::normalized(&value) == platform::normalized(&expected))
        {
            registry::delete_key(&key, view)?;
        }
    }
    if manifest_path(directory).exists() {
        fs::remove_file(manifest_path(directory))?;
    }
    Ok(
        json!({"uninstalled":true,"enabled":false,"retained":"disabled configuration, logs and binaries (no delayed self-deletion)"}),
    )
}

pub fn status(directory: &Path) -> Value {
    daemon::request(directory,"status").unwrap_or_else(|error|json!({"watchdogRunning":false,"reason":error.to_string(),"lastKnown":storage::read_json::<Value>(&directory.join("status.json")).ok()}))
}

pub fn doctor(directory: &Path) -> Value {
    let mut checks = vec![];
    let config = match storage::read_config(directory) {
        Ok(config) => config,
        Err(error) => {
            return json!({"ok":false,"checks":[{"name":"configuration","ok":false,"detail":error.to_string()}]})
        }
    };
    checks.push(json!({"name":"configuration","ok":true}));
    let path = manifest_path(directory);
    let expected = path.to_string_lossy().into_owned();
    let manifest = storage::read_json::<Value>(&path).ok();
    let origin = format!("chrome-extension://{}/", config.target.extension_id);
    let manifest_ok = manifest.as_ref().is_some_and(|m| {
        m["name"] == HOST_NAME
            && m["type"] == "stdio"
            && m["allowed_origins"] == json!([origin])
            && m["path"].as_str().is_some_and(|p| Path::new(p).is_file())
    });
    checks.push(json!({"name":"hostManifest","ok":manifest_ok,"path":path}));
    let key = registry_key(&config.target);
    for view in [VIEW32, VIEW64] {
        let value = registry::read(&key, "", view);
        let ok = match &value {
            Ok(Some(value)) => platform::normalized(value) == platform::normalized(&expected),
            Ok(None) => view == VIEW32,
            Err(_) => false,
        };
        checks.push(json!({"name":if view==VIEW32{"registry32"}else{"registry64"},"ok":ok,"detail":format!("{value:?}")}));
    }
    let current = status(directory);
    checks.push(json!({"name":"watchdog","ok":current["watchdogRunning"]==true,"status":current}));
    checks.push(json!({"name":"nativeHandshake","ok":current["extensionConnected"]==true && current["verified"]==true,"detail":"keep the registered browser and extension communication running"}));
    checks.push(json!({"name":"browserPaths","ok":config.target.browser_path.is_file() && config.target.user_data_dir.is_dir()}));
    let ok = checks.iter().all(|check| check["ok"] == true);
    json!({"ok":ok,"checks":checks,"autostart":registry::read(RUN_KEY,&startup_name(directory),VIEW64).ok().flatten().as_deref()==Some(&startup_command(directory))})
}
