use crate::{
    config::{Config, Target, PROTOCOL_VERSION},
    engine::{Action, Engine, InstanceId},
    platform,
    protocol::{read_frame, write_frame, Message},
    storage::{self, EventLog},
    windows_runtime::{self, InstanceLock},
};
use serde_json::{json, Value};
use std::{
    fs::{self, File, OpenOptions},
    io,
    path::Path,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc, Arc, Mutex,
    },
    thread,
    time::Duration,
};

struct NativeRequest {
    instance: InstanceId,
    target: Target,
    session: String,
    message: Message,
    reply: mpsc::Sender<io::Result<Message>>,
}
struct Disconnected {
    session: String,
}
enum Event {
    Native(Box<NativeRequest>),
    Disconnected(Disconnected),
    Error(String),
}
static SESSION_COUNTER: AtomicU64 = AtomicU64::new(1);

fn association(pid: u32, config: &Config) -> io::Result<InstanceId> {
    let chain = platform::ancestors(pid)?;
    let mut matches = vec![];
    for entry in chain {
        if let Some(pid) = entry["pid"].as_u64() {
            if let Ok(info) = platform::identity(pid as u32) {
                if platform::matches_registered(&info, &config.target) {
                    matches.push(platform::instance(&info)?);
                }
            }
        }
    }
    if matches.len() != 1 {
        return Err(io::Error::other(
            "native host cannot be uniquely associated with the registered browser",
        ));
    }
    Ok(matches.remove(0))
}

fn serve(
    mut pipe: File,
    pid: u32,
    config: Arc<Mutex<Config>>,
    status: Arc<Mutex<Value>>,
    stop: Arc<AtomicBool>,
    events: mpsc::Sender<Event>,
) -> io::Result<()> {
    let mut session = None;
    let mut target_at_connect = None;
    let mut associated = None;
    let mut sequence = 0;
    let result = (|| -> io::Result<()> {
        while let Some(request) = read_frame::<Value>(&mut pipe)? {
            match request["operation"].as_str() {
                Some("status") => {
                    write_frame(
                        &mut pipe,
                        &*status
                            .lock()
                            .map_err(|_| io::Error::other("status lock poisoned"))?,
                    )?;
                }
                Some("stop") => {
                    stop.store(true, Ordering::SeqCst);
                    write_frame(&mut pipe, &json!({"stopping":true}))?;
                    return Ok(());
                }
                Some("native") => {
                    let current = config
                        .lock()
                        .map_err(|_| io::Error::other("config lock poisoned"))?
                        .clone();
                    if request["origin"]
                        .as_str()
                        .unwrap_or("")
                        .trim_end_matches('/')
                        != format!("chrome-extension://{}", current.target.extension_id)
                    {
                        return Err(io::Error::other(
                            "caller origin does not match registration",
                        ));
                    }
                    let message: Message = serde_json::from_value(request["message"].clone())
                        .map_err(io::Error::other)?;
                    if message.kind == "hello"
                        && session.is_none()
                        && message.payload["protocolVersion"] == PROTOCOL_VERSION
                    {
                        associated = Some(association(pid, &current)?);
                        target_at_connect = Some(current.target.clone());
                        session = Some(format!(
                            "{}-{}-{}",
                            std::process::id(),
                            pid,
                            SESSION_COUNTER.fetch_add(1, Ordering::Relaxed)
                        ));
                    } else if message.kind == "heartbeat" && session.is_some() {
                        let next = message.payload["sequence"]
                            .as_u64()
                            .ok_or_else(|| io::Error::other("invalid heartbeat sequence"))?;
                        if message.payload["sessionId"].as_str() != session.as_deref()
                            || next <= sequence
                        {
                            return Err(io::Error::other("stale or invalid heartbeat"));
                        }
                        sequence = next;
                    } else if message.kind != "status-request" || session.is_none() {
                        return Err(io::Error::other("invalid message or handshake"));
                    }
                    if target_at_connect.as_ref() != Some(&current.target) {
                        return Err(io::Error::other("registration changed; reconnect required"));
                    }
                    let (reply, receiver) = mpsc::channel();
                    events
                        .send(Event::Native(Box::new(NativeRequest {
                            instance: associated
                                .clone()
                                .ok_or_else(|| io::Error::other("no browser association"))?,
                            target: current.target,
                            session: session.clone().unwrap_or_default(),
                            message,
                            reply,
                        })))
                        .map_err(io::Error::other)?;
                    let response = receiver
                        .recv_timeout(Duration::from_secs(3))
                        .map_err(io::Error::other)??;
                    write_frame(&mut pipe, &response)?;
                }
                _ => return Err(io::Error::other("unknown local operation")),
            }
        }
        Ok(())
    })();
    if let Some(session) = session {
        let _ = events.send(Event::Disconnected(Disconnected { session }));
    }
    result
}

fn snapshot(engine: &Engine, config: &Config, dry_run: bool, now: u64, verified: bool) -> Value {
    json!({"protocolVersion":PROTOCOL_VERSION,"watchdogRunning":true,"watchdogPid":std::process::id(),
        "state":engine.state,"enabled":config.enabled,"dryRun":dry_run,"targetPid":engine.instance.as_ref().map(|id|id.pid),
        "extensionConnected":engine.session.is_some() && engine.heartbeat_age(now)<config.timing.heartbeat_timeout_ms,
        "extensionId":config.target.extension_id,"remainingMs":engine.deadline.map(|end|end.saturating_sub(now)),
        "reason":engine.reason,"verified":verified,"updatedAt":storage::timestamp()})
}

fn discover(target: &Target) -> io::Result<Option<InstanceId>> {
    let entries = platform::processes()?;
    let name = target
        .browser_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();
    let mut instances = vec![];
    for (pid, (_, process_name)) in entries {
        if process_name.to_lowercase() != name {
            continue;
        }
        match platform::identity(pid) {
            Ok(info) if platform::matches_registered(&info, target) => {
                instances.push(platform::instance(&info)?)
            }
            Ok(_) => {}
            Err(error) if error.raw_os_error() == Some(5) => {
                return Err(io::Error::other(
                    "cannot inspect a running browser; check that it is not elevated",
                ))
            }
            Err(_) => {} // Processes may exit between the snapshot and OpenProcess.
        }
    }
    if instances.len() > 1 {
        return Err(io::Error::other(
            "more than one browser root matches the registered target",
        ));
    }
    Ok(instances.pop())
}

pub fn run(directory: &Path, dry_run: bool, notify: bool) -> io::Result<()> {
    fs::create_dir_all(directory)?;
    let pipe_name = storage::pipe_name(directory);
    let lock = InstanceLock::acquire(&format!(r"Local\{}", pipe_name.replace('\\', "_")))?;
    assert!(lock.is_held());
    let mut config = storage::read_config(directory)?;
    let config_shared = Arc::new(Mutex::new(config.clone()));
    let mut engine = Engine::new(config.timing.clone(), config.enabled, dry_run);
    let status = Arc::new(Mutex::new(Value::Null));
    let stop = Arc::new(AtomicBool::new(false));
    let (sender, receiver) = mpsc::channel();
    let server_config = config_shared.clone();
    let server_status = status.clone();
    let server_stop = stop.clone();
    thread::spawn(move || loop {
        match platform::accept_pipe(&pipe_name) {
            Ok((pipe, pid)) => {
                let config = server_config.clone();
                let status = server_status.clone();
                let stop = server_stop.clone();
                let sender = sender.clone();
                thread::spawn(move || {
                    if let Err(error) = serve(pipe, pid, config, status, stop, sender.clone()) {
                        let _ = sender.send(Event::Error(error.to_string()));
                    }
                });
            }
            Err(error) => {
                let _ = sender.send(Event::Error(format!("pipe server failed: {error}")));
                server_stop.store(true, Ordering::SeqCst);
                break;
            }
        }
        if server_stop.load(Ordering::SeqCst) {
            break;
        }
    });
    let mut log = EventLog::new(directory)?;
    log.record(json!({"event":"watchdogStarted","pid":std::process::id(),"dryRun":dry_run}))?;
    if notify {
        windows_runtime::show_countdown(status.clone());
    }
    let mut last_active = windows_runtime::active_time()?;
    let mut last_uptime = windows_runtime::uptime();
    let mut last_scan = 0;
    let mut last_write = 0;
    let mut previous = Value::Null;
    let mut verified_target = storage::read_json::<Value>(&directory.join("verified.json"))
        .ok()
        .and_then(|v| serde_json::from_value::<Target>(v["target"].clone()).ok());
    while !stop.load(Ordering::SeqCst) {
        let now = windows_runtime::active_time()?;
        let uptime = windows_runtime::uptime();
        if uptime.saturating_sub(last_uptime) > now.saturating_sub(last_active) + 1500 {
            engine.resumed(now);
            log.record(json!({"event":"systemResumed"}))?;
        }
        last_uptime = uptime;
        last_active = now;
        if now.saturating_sub(last_scan) >= 500 {
            last_scan = now;
            match storage::read_config(directory) {
                Ok(next) => {
                    if next.target != config.target || next.timing != config.timing {
                        engine = Engine::new(next.timing.clone(), next.enabled, dry_run);
                    } else {
                        engine.set_enabled(next.enabled, now);
                    }
                    config = next;
                    *config_shared
                        .lock()
                        .map_err(|_| io::Error::other("config lock poisoned"))? = config.clone();
                }
                Err(error) => engine.fault(format!("configuration error: {error}")),
            }
            match discover(&config.target) {
                Ok(instance) => engine.observe(instance, now),
                Err(error) => engine.fault(error.to_string()),
            }
        }
        // Events already queued are processed before deadline actions.
        for event in receiver.try_iter() {
            match event {
                Event::Native(request) => {
                    let result = if request.target != config.target
                        || engine.instance.as_ref() != Some(&request.instance)
                    {
                        Err(io::Error::other(
                            "browser instance is not currently registered",
                        ))
                    } else {
                        match request.message.kind.as_str() {
                            "hello" => {
                                if engine.connected(&request.instance, request.session.clone(), now)
                                {
                                    storage::write_json(
                                        &directory.join("verified.json"),
                                        &json!({"target":config.target,"verifiedAt":storage::timestamp()}),
                                    )?;
                                    verified_target = Some(config.target.clone());
                                    log.record(json!({"event":"connected","sessionId":request.session,"target":request.instance}))?;
                                    Ok(Message::new(
                                        "ready",
                                        json!({"protocolVersion":PROTOCOL_VERSION,"watchdogReady":true,"sessionId":request.session,"monitor":snapshot(&engine,&config,dry_run,now,true)}),
                                    ))
                                } else {
                                    Err(io::Error::other(
                                        "watchdog is faulted or already terminating",
                                    ))
                                }
                            }
                            "heartbeat" if engine.session.as_deref() == Some(&request.session) => {
                                engine.heartbeat(&request.session, now);
                                let mut payload = request.message.payload;
                                payload["monitor"] = snapshot(
                                    &engine,
                                    &config,
                                    dry_run,
                                    now,
                                    verified_target.as_ref() == Some(&config.target),
                                );
                                Ok(Message::new("pong", payload))
                            }
                            "status-request" => Ok(Message::new(
                                "status",
                                snapshot(
                                    &engine,
                                    &config,
                                    dry_run,
                                    now,
                                    verified_target.as_ref() == Some(&config.target),
                                ),
                            )),
                            _ => Err(io::Error::other("session has been replaced")),
                        }
                    };
                    let _ = request.reply.send(result);
                }
                Event::Disconnected(event) => {
                    for action in engine.disconnected(&event.session, now) {
                        log.record(json!({"event":"warning","detail":format!("{action:?}")}))?;
                    }
                }
                Event::Error(error) => {
                    log.record(json!({"event":"connectionError","reason":error}))?
                }
            }
        }
        for action in engine.tick(now) {
            let result = match &action {
                Action::Warning { reason, .. } => {
                    log.record(json!({"event":"warning","reason":reason}))?;
                    Ok(())
                }
                Action::WouldClose(id) => {
                    log.record(json!({"event":"wouldClose","target":id}))?;
                    Ok(())
                }
                Action::RequestClose(id) => {
                    log.record(json!({"event":"requestClose","target":id}))?;
                    windows_runtime::request_close(id, &config.target)
                }
                Action::Terminate(id) => windows_runtime::terminate(id, &config.target)
                    .and_then(|pids| log.record(json!({"event":"terminated","pids":pids}))),
            };
            if let Err(error) = result {
                log.record(json!({"event":"actionFailed","reason":error.to_string()}))?;
                engine.fault(error.to_string());
            }
        }
        let current = snapshot(
            &engine,
            &config,
            dry_run,
            now,
            verified_target.as_ref() == Some(&config.target),
        );
        *status
            .lock()
            .map_err(|_| io::Error::other("status lock poisoned"))? = current.clone();
        if current["state"] != previous["state"] || current["targetPid"] != previous["targetPid"] {
            log.record(json!({"event":"state","status":current}))?;
        }
        if now.saturating_sub(last_write) >= 1000 || current["state"] != previous["state"] {
            storage::write_json(&directory.join("status.json"), &current)?;
            last_write = now;
        }
        previous = current;
        thread::sleep(Duration::from_millis(100));
    }
    let stopped = json!({"watchdogRunning":false,"stopped":true,"updatedAt":storage::timestamp()});
    *status
        .lock()
        .map_err(|_| io::Error::other("status lock poisoned"))? = stopped.clone();
    storage::write_json(&directory.join("status.json"), &stopped)?;
    log.record(json!({"event":"watchdogStopped"}))
}

/// A local CLI query has a bounded wait even if another process owns a broken pipe.
pub fn request(directory: &Path, operation: &str) -> io::Result<Value> {
    let name = storage::pipe_name(directory);
    let operation = operation.to_owned();
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let result = (|| {
            let mut pipe = OpenOptions::new().read(true).write(true).open(name)?;
            write_frame(&mut pipe, &json!({"operation":operation}))?;
            read_frame::<Value>(&mut pipe)?
                .ok_or_else(|| io::Error::other("watchdog closed the pipe"))
        })();
        let _ = sender.send(result);
    });
    receiver
        .recv_timeout(Duration::from_secs(3))
        .map_err(io::Error::other)?
}
