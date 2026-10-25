#![windows_subsystem = "windows"]
use chromium_extension_monitor::{daemon, desktop, install, notifications, storage};
use clap::Parser;
#[derive(Parser)]
struct Args {
    #[arg(long)]
    data_dir: Option<std::path::PathBuf>,
    #[arg(long)]
    dry_run: bool,
    #[arg(long)]
    no_notify: bool,
    #[arg(long)]
    background: bool,
    #[arg(long)]
    settings: bool,
    #[arg(long)]
    setup: bool,
    #[arg(long)]
    activate: Option<String>,
}
fn main() {
    let args = Args::parse();
    let directory = match storage::data_dir(args.data_dir) {
        Ok(dir) => dir,
        Err(error) => {
            desktop::show_error("无法启动专注守护", &error.to_string());
            return;
        }
    };
    let result = (|| -> std::io::Result<()> {
        let executable = std::env::current_exe()?;
        let distribution =
            chromium_extension_monitor::platform::normalized(&executable.to_string_lossy())
                != chromium_extension_monitor::platform::normalized(
                    &directory
                        .join("bin/bilibili-focus-watchdog.exe")
                        .to_string_lossy(),
                );
        if args.setup
            || (!args.background
                && !args.no_notify
                && args.activate.is_none()
                && (distribution || storage::read_config(&directory).is_err()))
        {
            return desktop::setup::run(&directory);
        }
        let action = args
            .activate
            .as_deref()
            .map(|uri| notifications::action(&directory, uri))
            .transpose()?;
        if action.is_some() {
            install::start(&directory, args.dry_run, true)?;
        }
        match action {
            Some("pause") => {
                install::set_enabled(&directory, false)?;
            }
            Some("resume") => {
                install::set_enabled(&directory, true)?;
            }
            _ => {}
        }
        let show = args.settings || !args.background || action.is_some();
        if daemon::request(&directory, "status").is_ok() {
            if show {
                let reply = daemon::request(&directory, "show")?;
                if reply["shown"] != true {
                    return Err(std::io::Error::other(
                        "后台以无界面模式运行，请先停止后重新启动桌面模式。",
                    ));
                }
            }
            return Ok(());
        }
        daemon::run_options(&directory, args.dry_run, !args.no_notify, show)
    })();
    if let Err(error) = result {
        if std::fs::create_dir_all(&directory).is_ok() {
            let _ = std::fs::write(directory.join("startup-error.txt"), error.to_string());
        }
        if !args.no_notify {
            desktop::show_error(
                "专注守护启动失败",
                &format!(
                    "{}\n\n{}\n请查看安装说明或运行 monitor.exe doctor。",
                    chromium_extension_monitor::notices::friendly_error(&error.to_string()),
                    error
                ),
            );
        }
        std::process::exit(1);
    }
}
