use std::path::Path;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

use crate::config::LoggingConfig;

/// 日志守卫（保持日志文件打开）
pub struct LogGuard {
    _file_guard: WorkerGuard,
}

/// 初始化日志系统
pub fn init_logging(config: &LoggingConfig) -> crate::Result<LogGuard> {
    // 创建日志目录
    let log_path = Path::new(&config.file_path);
    if let Some(parent) = log_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    // 创建文件日志 writer
    let file_appender = tracing_appender::rolling::daily(
        log_path.parent().unwrap_or(Path::new(".")),
        log_path
            .file_name()
            .unwrap_or(std::ffi::OsStr::new("chromium-monitor.log")),
    );

    let (file_writer, file_guard) = tracing_appender::non_blocking(file_appender);

    // 创建标准输出 writer
    let stdout_writer = std::io::stdout;

    // 创建过滤器
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&config.level));

    // 创建格式化器
    let file_layer = fmt::layer()
        .with_writer(file_writer)
        .with_ansi(false)
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .with_filter(filter.clone());

    let stdout_layer = fmt::layer()
        .with_writer(stdout_writer)
        .with_ansi(true)
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .with_filter(filter);

    // 初始化追踪订阅者
    tracing_subscriber::registry()
        .with(file_layer)
        .with(stdout_layer)
        .init();

    tracing::info!("日志系统初始化完成，级别：{}", config.level);

    Ok(LogGuard {
        _file_guard: file_guard,
    })
}

/// 简化版日志初始化（用于测试）
pub fn init_test_logging() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .with_test_writer()
        .init();
}
