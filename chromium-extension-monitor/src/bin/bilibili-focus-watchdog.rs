#![windows_subsystem = "windows"]

use clap::Parser;
#[derive(Parser)]
struct Args {
    #[arg(long)]
    data_dir: Option<std::path::PathBuf>,
    #[arg(long)]
    dry_run: bool,
    #[arg(long)]
    no_notify: bool,
}
fn main() {
    let args = Args::parse();
    let directory = match chromium_extension_monitor::storage::data_dir(args.data_dir) {
        Ok(directory) => directory,
        Err(_) => std::process::exit(1),
    };
    if let Err(error) =
        chromium_extension_monitor::daemon::run(&directory, args.dry_run, !args.no_notify)
    {
        if std::fs::create_dir_all(&directory).is_ok() {
            let _ = std::fs::write(directory.join("startup-error.txt"), error.to_string());
        }
        std::process::exit(1);
    }
}
