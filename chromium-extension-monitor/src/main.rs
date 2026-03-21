use chromium_extension_monitor::config::ConfigManager;
use chromium_extension_monitor::monitor::MonitorService;
use chromium_extension_monitor::utils;
use chromium_extension_monitor::utils::logger;
use chromium_extension_monitor::Result;
use clap::Parser;
use tracing::{error, info};

fn main() -> Result<()> {
    // 解析 CLI 参数
    let cli_args = chromium_extension_monitor::config::CliArgs::parse();

    // 创建配置管理器
    let config_manager = ConfigManager::from_cli(cli_args.clone())?;
    let config = config_manager.config().clone();

    // 初始化日志系统
    let _log_guard = logger::init_logging(&config.logging)?;

    info!("Chromium Extension Monitor 启动");
    info!("配置文件：{:?}", config_manager.config_path());
    info!("监控间隔：{}s", config.monitor.check_interval);
    info!("终止延迟：{}s", config.monitor.kill_delay);

    // 隐藏控制台窗口（如果配置为不显示）
    #[cfg(windows)]
    {
        if !config.monitor.show_console {
            utils::hide_console();
        }
    }

    // 检查管理员权限
    #[cfg(windows)]
    {
        if !utils::is_admin() {
            info!("检测到未以管理员权限运行，正在请求管理员权限...");
            if let Err(e) = utils::request_admin() {
                error!("请求管理员权限失败：{}", e);
                error!("建议：右键点击程序 -> 以管理员身份运行");
            }
        } else {
            info!("以管理员权限运行");
        }
    }

    // 创建监控服务
    let mut monitor = MonitorService::new(config.clone());

    // 设置 Ctrl+C 处理器
    let running = monitor.running_flag();
    let running_clone = running.clone();
    ctrlc_handler(move || {
        info!("收到退出信号");
        running_clone.store(false, std::sync::atomic::Ordering::SeqCst);
    })?;

    // 运行监控循环
    info!("开始监控循环");
    monitor.run()?;

    info!("监控服务已停止");
    Ok(())
}

/// Ctrl+C 处理器
fn ctrlc_handler<F: Fn() + Send + Sync + 'static>(f: F) -> Result<()> {
    ctrlc::set_handler(move || {
        f();
    })
    .map_err(|e| chromium_extension_monitor::AppError::other(format!("设置 Ctrl+C 处理器失败：{}", e)))?;
    Ok(())
}
