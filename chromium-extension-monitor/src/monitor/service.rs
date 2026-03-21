use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

use crate::config::Config;
use crate::extension::{DetectionResult, ExtensionDetector};
use crate::process::{ProcessManager, TerminationResult};

/// 监控状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MonitorState {
    /// 空闲
    Idle,

    /// 监控中
    Monitoring,

    /// 警告中（扩展缺失，倒计时中）
    Warning {
        /// 剩余时间（秒）
        remaining_seconds: u64,
    },

    /// 终止中
    Terminating,

    /// 已暂停
    Paused,

    /// 已停止
    Stopped,
}

/// 监控统计
#[derive(Debug, Default, Clone)]
pub struct MonitorStats {
    /// 检测次数
    pub detection_count: usize,

    /// 警告次数
    pub warning_count: usize,

    /// 终止次数
    pub termination_count: usize,

    /// 最后检测时间
    pub last_detection: Option<Instant>,

    /// 运行时长
    pub uptime: Duration,
}

/// 监控服务
pub struct MonitorService {
    /// 配置
    config: Config,

    /// 扩展检测器
    detector: ExtensionDetector,

    /// 进程管理器
    process_manager: ProcessManager,

    /// 当前状态
    state: MonitorState,

    /// 运行标志
    running: Arc<AtomicBool>,

    /// 暂停标志
    paused: Arc<AtomicBool>,

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
        let detector = ExtensionDetector::new(
            config.chromium.user_data_dirs.clone(),
            config.extension.target_extensions.clone(),
        );

        let process_manager = ProcessManager::new(config.chromium.process_names.clone());

        let running = Arc::new(AtomicBool::new(false));
        let paused = Arc::new(AtomicBool::new(false));

        Self {
            config,
            detector,
            process_manager,
            state: MonitorState::Idle,
            running,
            paused,
            stats: MonitorStats::default(),
            start_time: Instant::now(),
            warning_start_time: None,
        }
    }

    /// 获取运行标志
    pub fn running_flag(&self) -> Arc<AtomicBool> {
        self.running.clone()
    }

    /// 获取暂停标志
    pub fn paused_flag(&self) -> Arc<AtomicBool> {
        self.paused.clone()
    }

    /// 启动监控服务
    pub fn start(&mut self) -> crate::Result<()> {
        if self.running.load(Ordering::SeqCst) {
            return Err(crate::error::MonitorError::StartupFailed(
                "监控服务已在运行中".to_string(),
            )
            .into());
        }

        info!("启动监控服务");
        self.running.store(true, Ordering::SeqCst);
        self.paused.store(false, Ordering::SeqCst);
        self.state = MonitorState::Monitoring;
        self.start_time = Instant::now();

        Ok(())
    }

    /// 停止监控服务
    pub fn stop(&mut self) -> crate::Result<()> {
        info!("停止监控服务");
        self.running.store(false, Ordering::SeqCst);
        self.state = MonitorState::Stopped;
        Ok(())
    }

    /// 暂停监控
    pub fn pause(&mut self) {
        info!("暂停监控");
        self.paused.store(true, Ordering::SeqCst);
        self.state = MonitorState::Paused;
    }

    /// 恢复监控
    pub fn resume(&mut self) {
        info!("恢复监控");
        self.paused.store(false, Ordering::SeqCst);
        self.state = MonitorState::Monitoring;
        self.warning_start_time = None;
    }

    /// 运行监控循环
    pub fn run(&mut self) -> crate::Result<()> {
        self.start()?;

        let check_interval = Duration::from_secs(self.config.monitor.check_interval);
        let kill_delay = Duration::from_secs(self.config.monitor.kill_delay);

        info!("监控循环启动，检查间隔：{:?}, 终止延迟：{:?}", check_interval, kill_delay);

        while self.running.load(Ordering::SeqCst) {
            // 检查是否暂停
            if self.paused.load(Ordering::SeqCst) {
                std::thread::sleep(Duration::from_millis(100));
                continue;
            }

            // 执行检测
            match self.detect() {
                Ok(result) => {
                    self.stats.detection_count += 1;
                    self.stats.last_detection = Some(Instant::now());

                    if result.all_installed() {
                        // 扩展已安装，重置警告
                        self.warning_start_time = None;
                        self.state = MonitorState::Monitoring;
                        debug!("扩展已安装，继续监控");
                    } else {
                        // 扩展缺失，启动警告
                        if self.warning_start_time.is_none() {
                            self.warning_start_time = Some(Instant::now());
                            self.stats.warning_count += 1;
                            warn!("检测到扩展缺失，启动 {} 秒倒计时", self.config.monitor.kill_delay);
                        }

                        // 检查倒计时
                        if let Some(warning_start) = self.warning_start_time {
                            let elapsed = warning_start.elapsed();

                            if elapsed >= kill_delay {
                                // 倒计时结束，执行终止
                                info!("倒计时结束，开始终止进程");
                                self.state = MonitorState::Terminating;

                                match self.terminate_processes() {
                                    Ok(term_result) => {
                                        self.stats.termination_count += 1;
                                        info!(
                                            "终止完成，成功：{}, 失败：{}",
                                            term_result.terminated_count(),
                                            term_result.failed.len()
                                        );
                                    }
                                    Err(e) => {
                                        error!("终止进程失败：{}", e);
                                    }
                                }

                                // 重置警告
                                self.warning_start_time = None;
                                self.state = MonitorState::Monitoring;
                            } else {
                                // 更新状态
                                let remaining = self.config.monitor.kill_delay
                                    - elapsed.as_secs();
                                self.state = MonitorState::Warning {
                                    remaining_seconds: remaining,
                                };

                                info!("警告倒计时：剩余 {} 秒", remaining);
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("检测失败：{}", e);
                }
            }

            // 清理缓存
            self.detector.cleanup_cache();

            // 等待下一次检测
            debug!("等待下一次检测...");
            std::thread::sleep(check_interval);
        }

        info!("退出监控循环");
        self.stop()?;
        Ok(())
    }

    /// 执行检测
    pub fn detect(&mut self) -> crate::Result<DetectionResult> {
        self.detector.detect()
    }

    /// 终止进程
    fn terminate_processes(&mut self) -> crate::Result<TerminationResult> {
        self.process_manager.terminate_all()
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
    fn test_monitor_state_transitions() {
        let mut service = MonitorService::new(Config::default());

        // 初始状态
        assert_eq!(service.state(), MonitorState::Idle);

        // 启动
        service.start().unwrap();
        assert_eq!(service.state(), MonitorState::Monitoring);

        // 暂停
        service.pause();
        assert_eq!(service.state(), MonitorState::Paused);

        // 恢复
        service.resume();
        assert_eq!(service.state(), MonitorState::Monitoring);

        // 停止
        service.stop().unwrap();
        assert_eq!(service.state(), MonitorState::Stopped);
    }

    #[test]
    fn test_monitor_stats() {
        let mut service = MonitorService::new(Config::default());
        assert_eq!(service.stats().detection_count, 0);
        assert_eq!(service.stats().warning_count, 0);
        assert_eq!(service.stats().termination_count, 0);
    }
}
