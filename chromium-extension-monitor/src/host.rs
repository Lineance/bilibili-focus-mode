use crate::{
    protocol::{read_frame, write_frame, Message},
    storage,
};
use serde_json::json;
use std::{io, path::Path, sync::mpsc, thread};

enum Input {
    Browser(Option<Message>),
    Watchdog(Option<Message>),
    Failed(io::Error),
}

/// stdin is read independently so EOF ends this host even during a pending IPC
/// response. One worker owns the synchronous Windows pipe: a cloned handle with
/// a blocking ReadFile can otherwise prevent the next WriteFile from running.
pub fn run(directory: &Path, args: &[String]) -> io::Result<()> {
    let config = storage::read_config(directory)?;
    let origin = args
        .first()
        .ok_or_else(|| io::Error::other("missing caller origin"))?
        .to_owned();
    if origin.trim_end_matches('/') != format!("chrome-extension://{}", config.target.extension_id)
    {
        return Err(io::Error::other("caller origin is not registered"));
    }
    if args
        .iter()
        .skip(1)
        .any(|arg| !arg.starts_with("--parent-window="))
    {
        return Err(io::Error::other("unexpected native host argument"));
    }
    let mut pipe = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(storage::pipe_name(directory))?;
    let (sender, receiver) = mpsc::sync_channel(16);
    let browser_sender = sender.clone();
    let (requests, pending) = mpsc::sync_channel::<Message>(16);
    thread::spawn(move || {
        let mut stdin = io::stdin().lock();
        loop {
            let value = read_frame::<Message>(&mut stdin);
            let done = !matches!(&value, Ok(Some(_)));
            let event = match value {
                Ok(value) => Input::Browser(value),
                Err(error) => Input::Failed(error),
            };
            if browser_sender.send(event).is_err() || done {
                break;
            }
        }
    });
    thread::spawn(move || {
        for message in pending {
            let response = (|| -> io::Result<Option<Message>> {
                write_frame(
                    &mut pipe,
                    &json!({"operation":"native","origin":origin,"message":message}),
                )?;
                read_frame::<Message>(&mut pipe)
            })();
            let done = !matches!(&response, Ok(Some(_)));
            let event = match response {
                Ok(value) => Input::Watchdog(value),
                Err(error) => Input::Failed(error),
            };
            if sender.send(event).is_err() || done {
                break;
            }
        }
    });
    let mut stdout = io::stdout().lock();
    for event in receiver {
        match event {
            Input::Browser(Some(message)) => requests
                .try_send(message)
                .map_err(|_| io::Error::other("too many pending native messages"))?,
            Input::Watchdog(Some(message)) => write_frame(&mut stdout, &message)?,
            Input::Browser(None) | Input::Watchdog(None) => return Ok(()),
            Input::Failed(error) => return Err(error),
        }
    }
    Ok(())
}
