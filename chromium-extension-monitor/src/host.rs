use crate::{
    protocol::{read_frame, write_frame, Message},
    storage,
};
use serde_json::json;
use std::{fs::OpenOptions, io, path::Path, sync::mpsc, thread};

enum Input {
    Browser(Option<Message>),
    Watchdog(Option<Message>),
    Failed(io::Error),
}

/// Chrome owns this process. Independent stdin and IPC readers allow unsolicited
/// watchdog replies without blocking on the next message from the extension.
pub fn run(directory: &Path, args: &[String]) -> io::Result<()> {
    let config = storage::read_config(directory)?;
    let origin = args
        .first()
        .ok_or_else(|| io::Error::other("missing caller origin"))?;
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
    let mut pipe = OpenOptions::new()
        .read(true)
        .write(true)
        .open(storage::pipe_name(directory))?;
    let mut reader = pipe.try_clone()?;
    let (sender, receiver) = mpsc::sync_channel(16);
    let browser_sender = sender.clone();
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
    thread::spawn(move || loop {
        let value = read_frame::<Message>(&mut reader);
        let done = !matches!(&value, Ok(Some(_)));
        let event = match value {
            Ok(value) => Input::Watchdog(value),
            Err(error) => Input::Failed(error),
        };
        if sender.send(event).is_err() || done {
            break;
        }
    });
    let mut stdout = io::stdout().lock();
    for event in receiver {
        match event {
            Input::Browser(Some(message)) => write_frame(
                &mut pipe,
                &json!({"operation":"native","origin":origin,"message":message}),
            )?,
            Input::Watchdog(Some(message)) => write_frame(&mut stdout, &message)?,
            Input::Browser(None) | Input::Watchdog(None) => return Ok(()),
            Input::Failed(error) => return Err(error),
        }
    }
    Ok(())
}
