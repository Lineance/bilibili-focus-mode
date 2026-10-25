mod platform;
mod protocol;

use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::PathBuf;
use std::sync::{mpsc, Arc};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use protocol::{read_frame, write_frame};
use serde_json::{json, Value};

fn millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn config() -> io::Result<(PathBuf, Value)> {
    let path = std::env::var_os("FOCUS_PROBE_CONFIG")
        .ok_or_else(|| io::Error::other("FOCUS_PROBE_CONFIG is required"))?;
    let path = PathBuf::from(path);
    let value = serde_json::from_slice(&fs::read(&path)?)?;
    Ok((
        path.parent()
            .ok_or_else(|| io::Error::other("config directory missing"))?
            .to_owned(),
        value,
    ))
}

fn host(args: &[String], config: &Value) -> io::Result<()> {
    let origin = args
        .first()
        .ok_or_else(|| io::Error::other("missing caller origin"))?;
    if origin.trim_end_matches('/')
        != format!(
            "chrome-extension://{}",
            config["extensionId"].as_str().unwrap_or("")
        )
    {
        return Err(io::Error::other("unexpected caller origin"));
    }
    for arg in &args[1..] {
        if !arg.starts_with("--parent-window=") {
            return Err(io::Error::other("unexpected host argument"));
        }
    }
    let mut pipe = OpenOptions::new()
        .read(true)
        .write(true)
        .open(config["pipeName"].as_str().unwrap_or(""))?;
    let mut input = io::stdin().lock();
    let mut output = io::stdout().lock();
    while let Some(message) = read_frame(&mut input)? {
        write_frame(
            &mut pipe,
            &json!({"origin":origin,"hostArgs":args,"message":message}),
        )?;
        let reply =
            read_frame(&mut pipe)?.ok_or_else(|| io::Error::other("watchdog pipe closed"))?;
        write_frame(&mut output, &reply)?;
    }
    Ok(())
}

fn same_instance(left: &Value, right: &Value) -> bool {
    left["pid"] == right["pid"] && left["created"] == right["created"]
}

fn serve(
    mut pipe: fs::File,
    pid: u32,
    config: Arc<Value>,
    sender: mpsc::Sender<Value>,
) -> io::Result<()> {
    let chain = platform::ancestors(pid)?;
    let target = chain
        .iter()
        .filter_map(|entry| platform::identity(entry["pid"].as_u64()? as u32).ok())
        .find(|info| {
            platform::matches_target(
                info,
                config["browser"].as_str().unwrap_or(""),
                config["userDataDir"].as_str().unwrap_or(""),
            )
        })
        .ok_or_else(|| io::Error::other("host has no matching browser ancestor"))?;
    let session = format!("{pid}-{}", millis());
    let mut enrolled = false;
    let result = (|| -> io::Result<()> {
        while let Some(envelope) = read_frame(&mut pipe)? {
            let expected = format!(
                "chrome-extension://{}",
                config["extensionId"].as_str().unwrap_or("")
            );
            if envelope["origin"]
                .as_str()
                .unwrap_or("")
                .trim_end_matches('/')
                != expected
            {
                return Err(io::Error::other("origin mismatch"));
            }
            let message = &envelope["message"];
            let reply = match message["type"].as_str() {
                Some("hello") if message["payload"]["protocolVersion"] == 1 => {
                    enrolled = true;
                    sender.send(json!({"event":"connected","session":session,"target":target,"hostPid":pid,"ancestors":chain,"hostArgs":envelope["hostArgs"]})).map_err(io::Error::other)?;
                    json!({"type":"ready","payload":{"protocolVersion":1,"watchdogReady":true,"sessionId":session}})
                }
                Some("heartbeat") if enrolled && message["payload"]["sessionId"] == session => {
                    sender.send(json!({"event":"heartbeat","session":session,"target":target,"sequence":message["payload"]["sequence"]})).map_err(io::Error::other)?;
                    json!({"type":"pong","payload":message["payload"]})
                }
                Some("probe-echo") if enrolled => {
                    json!({"type":"probe-echo","payload":message["payload"]})
                }
                _ => return Err(io::Error::other("invalid probe message")),
            };
            write_frame(&mut pipe, &reply)?;
        }
        Ok(())
    })();
    if enrolled {
        let _ = sender
            .send(json!({"event":"pipe_closed","session":session,"target":target,"hostPid":pid}));
    }
    result
}

fn watch(directory: PathBuf, config: Value) -> io::Result<()> {
    let config = Arc::new(config);
    let mut log = OpenOptions::new()
        .create(true)
        .append(true)
        .open(directory.join("events.jsonl"))?;
    let (sender, receiver) = mpsc::channel();
    let thread_config = config.clone();
    let thread_directory = directory.clone();
    thread::spawn(move || loop {
        match platform::accept_pipe(thread_config["pipeName"].as_str().unwrap_or("")) {
            Ok((pipe, pid)) => {
                let sender = sender.clone();
                let config = thread_config.clone();
                thread::spawn(move || {
                    if let Err(error) = serve(pipe, pid, config, sender.clone()) {
                        let _ = sender.send(
                            json!({"event":"host_error","hostPid":pid,"reason":error.to_string()}),
                        );
                    }
                });
            }
            Err(error) => {
                let _ = sender.send(json!({"event":"pipe_error","reason":error.to_string()}));
                break;
            }
        }
        if thread_directory.join("stop").exists() {
            break;
        }
    });
    let started = Instant::now();
    let mut record = |mut event: Value| -> io::Result<()> {
        event["timestamp"] = json!(millis());
        event["elapsedMs"] = json!(started.elapsed().as_millis());
        writeln!(log, "{event}")?;
        log.flush()
    };
    record(json!({"event":"watchdog_started","pid":std::process::id(),"dryRun":true}))?;
    fs::write(
        directory.join("watchdog-ready.json"),
        json!({"pid":std::process::id()}).to_string(),
    )?;
    let startup = Duration::from_secs(config["startupSeconds"].as_u64().unwrap_or(30));
    let grace = Duration::from_secs(config["graceSeconds"].as_u64().unwrap_or(5));
    let timeout = Duration::from_secs(config["heartbeatTimeoutSeconds"].as_u64().unwrap_or(45));
    let browser_name = PathBuf::from(config["browser"].as_str().unwrap_or(""))
        .file_name()
        .ok_or_else(|| io::Error::other("invalid browser"))?
        .to_string_lossy()
        .to_lowercase();
    let mut target: Option<Value> = None;
    let mut session: Option<String> = None;
    let mut last_heartbeat = Instant::now();
    let mut deadline: Option<Instant> = None;
    let mut warned = false;
    let mut closed = false;
    while !directory.join("stop").exists() {
        let entries = platform::processes()?;
        let current = entries
            .iter()
            .filter(|(_, (_, name))| name.to_lowercase() == browser_name)
            .filter_map(|(pid, _)| platform::identity(*pid).ok())
            .find(|info| {
                platform::matches_target(
                    info,
                    config["browser"].as_str().unwrap_or(""),
                    config["userDataDir"].as_str().unwrap_or(""),
                )
            });
        if target
            .as_ref()
            .is_some_and(|old| current.as_ref().is_none_or(|new| !same_instance(old, new)))
        {
            record(json!({"event":"browser_exit","target":target}))?;
            target = None;
            session = None;
            deadline = None;
            warned = false;
            closed = false;
        }
        if target.is_none() && current.is_some() {
            target = current;
            record(json!({"event":"browser_discovered","target":target}))?;
            deadline = Some(Instant::now() + startup);
        }
        for event in receiver.try_iter() {
            record(event.clone())?;
            if !target
                .as_ref()
                .is_some_and(|info| same_instance(info, &event["target"]))
            {
                continue;
            }
            match event["event"].as_str() {
                Some("connected") => {
                    session = event["session"].as_str().map(str::to_owned);
                    last_heartbeat = Instant::now();
                    deadline = None;
                    warned = false;
                    closed = false;
                    record(json!({"event":"monitoring","target":target,"session":session}))?;
                }
                Some("heartbeat") if event["session"].as_str() == session.as_deref() => {
                    last_heartbeat = Instant::now()
                }
                Some("pipe_closed") if event["session"].as_str() == session.as_deref() => {
                    session = None;
                    if deadline.is_none() {
                        deadline = Some(Instant::now() + grace);
                    }
                    warned = true;
                    record(
                        json!({"event":"grace_started","reason":"pipe_closed","target":target}),
                    )?;
                }
                _ => {}
            }
        }
        if target.is_some()
            && session.is_some()
            && last_heartbeat.elapsed() >= timeout
            && deadline.is_none()
        {
            deadline = Some(Instant::now() + grace);
            warned = true;
            record(json!({"event":"grace_started","reason":"heartbeat_timeout","target":target}))?;
        }
        if deadline.is_some_and(|value| Instant::now() >= value) && !closed {
            if !warned {
                warned = true;
                deadline = Some(Instant::now() + grace);
                record(
                    json!({"event":"grace_started","reason":"startup_timeout","target":target}),
                )?;
            } else {
                closed = true;
                // There is deliberately no termination API in this prototype.
                record(json!({"event":"would_close","target":target,"dryRun":true}))?;
            }
        }
        thread::sleep(Duration::from_millis(100));
    }
    record(json!({"event":"watchdog_stopped"}))
}

fn main() {
    let result = (|| -> io::Result<()> {
        let (directory, config) = config()?;
        let args: Vec<String> = std::env::args().skip(1).collect();
        if args.first().is_some_and(|arg| arg == "watch") {
            watch(directory, config)
        } else {
            host(&args, &config)
        }
    })();
    if let Err(error) = result {
        eprintln!("[native-monitor-probe] {error}");
        std::process::exit(1);
    }
}
