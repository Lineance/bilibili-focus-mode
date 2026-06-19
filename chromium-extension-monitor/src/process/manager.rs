use std::collections::HashSet;
use sysinfo::{Process, System};
use tracing::{debug, error, info, warn};

/// 进程信息
#[derive(Debug, Clone)]
pub struct ProcessInfo {
    /// 进程 ID
    pub pid: u32,

    /// 进程名称
    pub name: String,

    /// 进程可执行文件路径
    pub exe: Option<String>,

    /// CPU 使用率
    pub cpu_usage: f32,

    /// 内存使用（MB）
    pub memory_usage: u64,
}

impl From<&Process> for ProcessInfo {
    fn from(process: &Process) -> Self {
        Self {
            pid: process.pid().as_u32(),
            name: process.name().to_string_lossy().to_string(),
            exe: process.exe().map(|p| p.display().to_string()),
            cpu_usage: process.cpu_usage(),
            memory_usage: process.memory() / 1024 / 1024,
        }
    }
}

/// 进程管理器
#[derive(Debug)]
pub struct ProcessManager {
    /// 系统信息
    system: System,

    /// 目标进程名称列表
    process_names: Vec<String>,
}

impl ProcessManager {
    /// 创建新的进程管理器
    pub fn new(process_names: Vec<String>) -> Self {
        Self {
            system: System::new(),
            process_names,
        }
    }

    /// 刷新进程信息
    pub fn refresh(&mut self) {
        use sysinfo::ProcessesToUpdate;
        self.system.refresh_processes(ProcessesToUpdate::All, true);
    }

    /// 获取所有目标进程
    pub fn get_target_processes(&mut self) -> Vec<ProcessInfo> {
        self.refresh();

        let mut processes = Vec::new();

        for (pid, process) in self.system.processes() {
            if self.is_target_process(process) {
                let info = ProcessInfo::from(process);
                debug!("找到目标进程：{} (PID: {})", info.name, pid.as_u32());
                processes.push(info);
            }
        }

        processes
    }

    /// 检查进程是否为目标进程
    fn is_target_process(&self, process: &Process) -> bool {
        let name = process.name().to_string_lossy().to_lowercase();
        self.process_names.iter().any(|target| {
            let target_lower = target.to_lowercase();
            name == target_lower || name.contains(&target_lower)
        })
    }

    /// 终止指定进程
    pub fn terminate_process(&mut self, pid: u32) -> crate::Result<()> {
        use sysinfo::Pid;

        let pid = Pid::from_u32(pid);

        if let Some(process) = self.system.process(pid) {
            info!("终止进程：{:?} (PID: {})", process.name(), pid);

            // 注意：Windows 优雅关闭需要额外的 API，这里直接强制终止

            // 强制终止
            if process.kill() {
                info!("成功终止进程 PID: {}", pid);
                Ok(())
            } else {
                error!("终止进程失败 PID: {}", pid);
                Err(crate::error::ProcessError::TerminateFailed(format!(
                    "无法终止进程 PID: {}",
                    pid
                ))
                .into())
            }
        } else {
            Err(crate::error::ProcessError::ProcessNotFound(pid.to_string()).into())
        }
    }

    /// 终止所有目标进程
    pub fn terminate_all(&mut self) -> crate::Result<TerminationResult> {
        let processes = self.get_target_processes();
        let mut result = TerminationResult::default();

        if processes.is_empty() {
            info!("未找到目标进程");
            return Ok(result);
        }

        info!("准备终止 {} 个目标进程", processes.len());

        // 使用 HashSet 避免重复终止
        let mut terminated_pids = HashSet::new();

        for process in processes {
            if terminated_pids.contains(&process.pid) {
                continue;
            }

            match self.terminate_process(process.pid) {
                Ok(()) => {
                    result.successful.push(process.pid);
                    terminated_pids.insert(process.pid);
                }
                Err(e) => {
                    result.failed.push(process.pid);
                    result.errors.push(format!("PID {}: {}", process.pid, e));
                    warn!("终止进程失败 PID {}: {}", process.pid, e);
                }
            }
        }

        Ok(result)
    }

    /// 检查是否有运行中的目标进程
    pub fn has_running_processes(&mut self) -> bool {
        self.refresh();

        for process in self.system.processes().values() {
            if self.is_target_process(process) {
                return true;
            }
        }

        false
    }

    /// 获取进程数量
    pub fn process_count(&mut self) -> usize {
        self.get_target_processes().len()
    }
}

/// 终止结果
#[derive(Debug, Default)]
pub struct TerminationResult {
    /// 成功终止的进程 PID 列表
    pub successful: Vec<u32>,

    /// 终止失败的进程 PID 列表
    pub failed: Vec<u32>,

    /// 错误信息列表
    pub errors: Vec<String>,
}

impl TerminationResult {
    /// 是否全部成功
    pub fn all_success(&self) -> bool {
        self.failed.is_empty()
    }

    /// 终止的进程数量
    pub fn terminated_count(&self) -> usize {
        self.successful.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_manager_creation() {
        let manager = ProcessManager::new(vec!["chromium.exe".to_string()]);
        assert_eq!(manager.process_names.len(), 1);
        assert_eq!(manager.process_names[0], "chromium.exe");
    }

    #[test]
    fn test_process_manager_refresh() {
        let mut manager = ProcessManager::new(vec!["notepad.exe".to_string()]);
        manager.refresh();
        // 应该能获取到一些进程
        let processes = manager.get_target_processes();
        // 不检查具体数量，因为取决于系统状态
    }

    #[test]
    fn test_termination_result() {
        let mut result = TerminationResult::default();
        result.successful = vec![1, 2, 3];
        result.failed = vec![4];

        assert!(!result.all_success());
        assert_eq!(result.terminated_count(), 3);
    }
}
