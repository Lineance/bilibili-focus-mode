use thiserror::Error;

/// 应用程序错误类型
#[derive(Error, Debug)]
pub enum AppError {
    #[error("配置错误：{0}")]
    Config(#[from] ConfigError),

    #[error("扩展检测错误：{0}")]
    ExtensionDetection(#[from] ExtensionError),

    #[error("进程管理错误：{0}")]
    Process(#[from] ProcessError),

    #[error("监控服务错误：{0}")]
    Monitor(#[from] MonitorError),

    #[error("系统托盘错误：{0}")]
    Tray(#[from] TrayError),

    #[error("IO 错误：{0}")]
    Io(#[from] std::io::Error),

    #[error("其他错误：{0}")]
    Other(String),
}

/// 配置错误类型
#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("配置文件不存在：{0}")]
    FileNotFound(String),

    #[error("配置文件解析失败：{0}")]
    ParseError(String),

    #[error("配置验证失败：{0}")]
    ValidationError(String),

    #[error("配置合并失败：{0}")]
    MergeError(String),
}

/// 扩展检测错误类型
#[derive(Error, Debug)]
pub enum ExtensionError {
    #[error("扩展目录不存在：{0}")]
    DirectoryNotFound(String),

    #[error("扩展未找到：{0}")]
    ExtensionNotFound(String),

    #[error("扩展清单文件读取失败：{0}")]
    ManifestReadError(String),
}

/// 进程管理错误类型
#[derive(Error, Debug)]
pub enum ProcessError {
    #[error("进程未找到：{0}")]
    ProcessNotFound(String),

    #[error("进程终止失败：{0}")]
    TerminateFailed(String),

    #[error("权限不足：{0}")]
    PermissionDenied(String),
}

/// 监控服务错误类型
#[derive(Error, Debug)]
pub enum MonitorError {
    #[error("监控服务启动失败：{0}")]
    StartupFailed(String),

    #[error("监控服务停止失败：{0}")]
    ShutdownFailed(String),

    #[error("监控循环错误：{0}")]
    LoopError(String),
}

/// 系统托盘错误类型
#[derive(Error, Debug)]
pub enum TrayError {
    #[error("托盘图标创建失败：{0}")]
    IconCreateFailed(String),

    #[error("托盘菜单创建失败：{0}")]
    MenuCreateFailed(String),

    #[error("托盘通知发送失败：{0}")]
    NotificationFailed(String),
}

impl AppError {
    pub fn other(msg: impl Into<String>) -> Self {
        AppError::Other(msg.into())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
