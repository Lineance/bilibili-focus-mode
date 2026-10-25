use chromium_extension_monitor::{config::Target, daemon, install, storage};
use clap::{Parser, Subcommand};
use std::{io, path::PathBuf};

#[derive(Parser)]
#[command(version, about = "Bilibili Focus Mode Windows monitor")]
struct Cli {
    #[arg(long, global = true)]
    data_dir: Option<PathBuf>,
    #[command(subcommand)]
    command: Command,
}
#[derive(Subcommand)]
enum Command {
    /// Register the host and copy the three distribution executables. Protection starts disabled.
    Install {
        #[arg(long)]
        browser: PathBuf,
        #[arg(long)]
        user_data_dir: PathBuf,
        #[arg(long)]
        extension_id: String,
        #[arg(long, default_value="chrome", value_parser=["chrome","chromium"])]
        registry_browser: String,
        /// Also match this executable when launched without a --user-data-dir flag.
        #[arg(long)]
        allow_default_profile: bool,
        #[arg(long)]
        autostart: bool,
    },
    Setup,
    Ui,
    NotifyTest,
    NotifyStatus,
    NotifySetup,
    Uninstall,
    Run {
        #[arg(long)]
        dry_run: bool,
        #[arg(long)]
        no_notify: bool,
    },
    Start {
        #[arg(long)]
        dry_run: bool,
        #[arg(long)]
        no_notify: bool,
    },
    Enable,
    Disable,
    Status,
    Doctor,
    Stop,
    Autostart {
        #[arg(value_parser=["on","off"])]
        mode: String,
    },
    Timing {
        #[arg(long)]
        startup_ms: Option<u64>,
        #[arg(long)]
        grace_ms: Option<u64>,
        #[arg(long)]
        heartbeat_timeout_ms: Option<u64>,
        #[arg(long)]
        close_wait_ms: Option<u64>,
        #[arg(long)]
        resume_ms: Option<u64>,
    },
}
fn main() {
    let result = (|| -> io::Result<()> {
        let cli = Cli::parse();
        let directory = storage::data_dir(cli.data_dir)?;
        std::fs::create_dir_all(&directory)?;
        let directory =
            chromium_extension_monitor::platform::plain_path(&std::fs::canonicalize(directory)?);
        let value = match cli.command {
            Command::Install {
                browser,
                user_data_dir,
                extension_id,
                registry_browser,
                allow_default_profile,
                autostart,
            } => install::install(
                &directory,
                Target {
                    browser_path: browser,
                    user_data_dir,
                    extension_id,
                    registry_browser,
                    allow_default_profile,
                },
                autostart,
            )?,
            Command::Setup => chromium_extension_monitor::desktop::setup::launch(&directory)?,
            Command::Ui => chromium_extension_monitor::desktop::open(&directory)?,
            Command::NotifyStatus => {
                chromium_extension_monitor::notifications::diagnostics(&directory)
            }
            Command::NotifyTest => chromium_extension_monitor::notifications::test(&directory)?,
            Command::NotifySetup => {
                chromium_extension_monitor::notifications::install_identity(&directory)?;
                serde_json::json!({"notificationsRegistered":true})
            }
            Command::Uninstall => install::uninstall(&directory)?,
            Command::Run { dry_run, no_notify } => {
                daemon::run(&directory, dry_run, !no_notify)?;
                return Ok(());
            }
            Command::Start { dry_run, no_notify } => {
                install::start(&directory, dry_run, !no_notify)?
            }
            Command::Enable => install::set_enabled(&directory, true)?,
            Command::Disable => install::set_enabled(&directory, false)?,
            Command::Status => install::status(&directory),
            Command::Doctor => {
                let value = install::doctor(&directory);
                println!("{}", serde_json::to_string_pretty(&value)?);
                if value["ok"] != true {
                    std::process::exit(1);
                }
                return Ok(());
            }
            Command::Stop => install::stop(&directory)?,
            Command::Autostart { mode } => {
                install::autostart(&directory, mode == "on")?;
                serde_json::json!({"autostart":mode=="on"})
            }
            Command::Timing {
                startup_ms,
                grace_ms,
                heartbeat_timeout_ms,
                close_wait_ms,
                resume_ms,
            } => {
                let mut config = storage::read_config(&directory)?;
                if let Some(value) = startup_ms {
                    config.timing.startup_ms = value;
                }
                if let Some(value) = grace_ms {
                    config.timing.grace_ms = value;
                }
                if let Some(value) = heartbeat_timeout_ms {
                    config.timing.heartbeat_timeout_ms = value;
                }
                if let Some(value) = close_wait_ms {
                    config.timing.close_wait_ms = value;
                }
                if let Some(value) = resume_ms {
                    config.timing.resume_ms = value;
                }
                config.validate()?;
                storage::write_json(&directory.join("config.json"), &config)?;
                serde_json::to_value(&config.timing)?
            }
        };
        println!("{}", serde_json::to_string_pretty(&value)?);
        Ok(())
    })();
    if let Err(error) = result {
        eprintln!("[Monitor] {error}");
        std::process::exit(1);
    }
}
