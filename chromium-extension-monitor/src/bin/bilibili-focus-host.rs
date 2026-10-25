fn main() {
    let result = (|| -> std::io::Result<()> {
        let directory = chromium_extension_monitor::storage::data_dir(None)?;
        chromium_extension_monitor::host::run(
            &directory,
            &std::env::args().skip(1).collect::<Vec<_>>(),
        )
    })();
    if let Err(error) = result {
        eprintln!("[NativeHost] {error}");
        std::process::exit(1);
    }
}
