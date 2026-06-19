use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{error, info};

use crate::config::Config;
use crate::native_messaging::{read_message, write_message, NativeMessagingHandler};
use std::io;

/// 监控状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MonitorState {
    /// 空闲（等待扩展连接）
    Idle,

    /// 监控中（扩展已连接）
    Monitoring,

    /// 警告中（扩展断开，倒计时中）
    Warning {
        /// 剩余时间（秒）
        remaining_seconds: u64,
    },

    /// 终止中
    Terminating,

    /// 已停止
    Stopped,
}

/// 监控统计
#[derive(Debug, Default, Clone)]
pub struct MonitorStats {
    /// 心跳次数
    pub heartbeat_count: usize,

    /// 警告次数
    pub warning_count: usize,

    /// 终止次数
    pub termination_count: usize,

    /// 最后心跳时间
    pub last_heartbeat: Option<Instant>,

    /// 运行时长
    pub uptime: Duration,
}

/// 监控服务
pub struct MonitorService {
    /// 配置
    config: Config,

    /// 当前状态
    state: MonitorState,

    /// 运行标志
    running: Arc<AtomicBool>,

    /// 统计信息
    stats: MonitorStats,

    /// 开始时间
    start_time: Instant,

    /// 警告开始时间
    warning_start_time: Option<Instant>,
}

impl MonitorService {
    /// 创建监控服务
    pub fn new(config: Config) -> Self {
        let running = Arc::new(AtomicBool::new(false));

        Self {
            config,
            state: MonitorState::Idle,
            running,
            stats: MonitorStats::default(),
            start_time: Instant::now(),
            warning_start_time: None,
        }
    }

    /// 获取运行标志
    pub fn running_flag(&self) -> Arc<AtomicBool> {
        self.running.clone()
    }

    /// 停止监控服务
    pub fn stop(&mut self) -> crate::Result<()> {
        info!("停止监控服务");
        self.running.store(false, Ordering::SeqCst);
        self.state = MonitorState::Stopped;
        Ok(())
    }

    /// 运行 Native Messaging 模式
    pub fn run_with_native_messaging(&mut self) -> crate::Result<()> {
        self.running.store(true, Ordering::SeqCst);
        self.start_time = Instant::now();

        info!("以 Native Messaging 主机模式启动");

        let handler = NativeMessagingHandler::new();
        let kill_delay = self.config.monitor.kill_delay;

        // 主线程阻塞式读取 Native Messaging
        let stdin = io::stdin();
        let stdout = io::stdout();
        let mut reader = stdin.lock();
        let mut writer = stdout.lock();

        self.state = MonitorState::Idle;
        info!("等待扩展连接...");

        while self.running.load(Ordering::SeqCst) {
            match read_message(&mut reader) {
                Ok(msg) => {
                    let response = handler.handle_message(msg);

                    // 更新统计
                    if response.get("type").and_then(|v| v.as_str()) == Some("pong") {
                        self.stats.heartbeat_count += 1;
                        self.stats.last_heartbeat = Some(Instant::now());

                        if self.state != MonitorState::Monitoring {
                            info!("扩展已连接");
                            self.state = MonitorState::Monitoring;
                            self.warning_start_time = None;
                        }
                    }

                    if let Err(e) = write_message(&mut writer, &response) {
                        error!("Native messaging write error: {}", e);
                        break;
                    }
                }
                Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => {
                    // stdin EOF = 扩展被禁用/卸载/Chrome 关闭
                    info!("扩展连接断开（EOF）");
                    handler.on_connection_lost();

                    // 进入警告倒计时
                    self.warning_start_time = Some(Instant::now());
                    self.stats.warning_count += 1;
                    self.state = MonitorState::Warning {
                        remaining_seconds: kill_delay,
                    };

                    info!("启动 {} 秒倒计时", kill_delay);

                    // 等待倒计时或重新连接
                    // 由于stdin EOF，进程应该退出
                    break;
                }
                Err(e) => {
                    error!("Native messaging read error: {}", e);
                    break;
                }
            }
        }

        info!("退出 Native Messaging 循环");
        self.stop()?;
        Ok(())
    }

    /// 获取当前状态
    pub fn state(&self) -> MonitorState {
        self.state
    }

    /// 获取统计信息
    pub fn stats(&self) -> &MonitorStats {
        &self.stats
    }

    /// 获取运行时长
    pub fn uptime(&self) -> Duration {
        self.start_time.elapsed()
    }

    /// 获取配置引用
    pub fn config(&self) -> &Config {
        &self.config
    }
}

impl std::fmt::Debug for MonitorService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MonitorService")
            .field("state", &self.state)
            .field("stats", &self.stats)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_monitor_service_creation() {
        let config = Config::default();
        let service = MonitorService::new(config);
        assert_eq!(service.state(), MonitorState::Idle);
    }

    #[test]
    fn test_monitor_stats() {
        let service = MonitorService::new(Config::default());
        assert_eq!(service.stats().heartbeat_count, 0);
        assert_eq!(service.stats().warning_count, 0);
        assert_eq!(service.stats().termination_count, 0);
    }
}
