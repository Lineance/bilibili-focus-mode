use chromium_extension_monitor::{daemon, storage};
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
    Run {
        #[arg(long)]
        dry_run: bool,
        #[arg(long)]
        no_notify: bool,
    },
    Status,
    Stop,
}
fn main() {
    let result = (|| -> io::Result<()> {
        let cli = Cli::parse();
        let directory = storage::data_dir(cli.data_dir)?;
        match cli.command {
            Command::Run { dry_run, no_notify } => daemon::run(&directory, dry_run, !no_notify),
            Command::Status => {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&daemon::request(&directory, "status")?)?
                );
                Ok(())
            }
            Command::Stop => {
                println!("{}", daemon::request(&directory, "stop")?);
                Ok(())
            }
        }
    })();
    if let Err(error) = result {
        eprintln!("[Monitor] {error}");
        std::process::exit(1);
    }
}
