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
    let result = (|| -> std::io::Result<()> {
        let args = Args::parse();
        let directory = chromium_extension_monitor::storage::data_dir(args.data_dir)?;
        chromium_extension_monitor::daemon::run(&directory, args.dry_run, !args.no_notify)
    })();
    if let Err(error) = result {
        // A login-started GUI binary has no terminal. Persist startup failures so
        // doctor can explain them without stealing focus with a modal dialog.
        if let Ok(directory) = chromium_extension_monitor::storage::data_dir(None) {
            let _ = std::fs::create_dir_all(&directory);
            let _ = std::fs::write(directory.join("startup-error.txt"), error.to_string());
        }
        std::process::exit(1);
    }
}
