use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tracing::info;
use tray_icon::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    TrayIcon, TrayIconBuilder,
};

use crate::monitor::MonitorState;

/// 系统托盘管理器
pub struct TrayManager {
    /// 托盘图标
    tray_icon: Option<TrayIcon>,

    /// 运行标志
    #[allow(dead_code)]
    running: Arc<AtomicBool>,

    /// 暂停标志
    #[allow(dead_code)]
    paused: Arc<AtomicBool>,
}

impl TrayManager {
    /// 创建托盘管理器
    pub fn new(running: Arc<AtomicBool>, paused: Arc<AtomicBool>) -> crate::Result<Self> {
        let menu = Menu::new();
        let running = running.clone();
        let paused = paused.clone();

        // 创建菜单项
        let status_item = MenuItem::new("状态：监控中", false, None);
        let pause_item = MenuItem::new("暂停监控", false, None);
        let quit_item = MenuItem::new("退出", false, None);

        menu.append(&status_item).map_err(|e| {
            crate::error::TrayError::MenuCreateFailed(format!("添加菜单项失败：{}", e))
        })?;
        menu.append(&PredefinedMenuItem::separator()).map_err(|e| {
            crate::error::TrayError::MenuCreateFailed(format!("添加分隔符失败：{}", e))
        })?;
        menu.append(&pause_item).map_err(|e| {
            crate::error::TrayError::MenuCreateFailed(format!("添加菜单项失败：{}", e))
        })?;
        menu.append(&quit_item).map_err(|e| {
            crate::error::TrayError::MenuCreateFailed(format!("添加菜单项失败：{}", e))
        })?;

        // 创建托盘图标
        let icon = tray_icon::Icon::from_rgba(
            vec![0, 0, 0, 255].repeat(32 * 32), // 简单的黑色 32x32 图标
            32,
            32,
        ).map_err(|e| {
            crate::error::TrayError::IconCreateFailed(format!("创建图标失败：{}", e))
        })?;

        let tray_icon = TrayIconBuilder::new()
            .with_icon(icon)
            .with_tooltip("Chromium Extension Monitor")
            .with_menu(Box::new(menu))
            .build()
            .map_err(|e| crate::error::TrayError::IconCreateFailed(format!("创建托盘失败：{}", e)))?;

        info!("系统托盘已创建");

        Ok(Self {
            tray_icon: Some(tray_icon),
            running,
            paused,
        })
    }

    /// 处理托盘事件（必须在主循环中调用）
    pub fn pump_events(&self) {
        // 处理托盘图标的事件 - 保持图标响应
        if let Some(tray) = &self.tray_icon {
            // 简单的消息泵送，保持托盘图标可见
            let _ = tray.set_tooltip(Some("Chromium Extension Monitor"));
        }
    }

    /// 更新托盘状态
    pub fn update_state(&self, state: MonitorState) {
        if let Some(tray) = &self.tray_icon {
            let _tooltip = match state {
                MonitorState::Idle => "Chromium Extension Monitor - 空闲".to_string(),
                MonitorState::Monitoring => "Chromium Extension Monitor - 监控中".to_string(),
                MonitorState::Warning { remaining_seconds } => {
                    format!("Chromium Extension Monitor - 警告：剩余 {} 秒", remaining_seconds)
                }
                MonitorState::Terminating => "Chromium Extension Monitor - 终止中".to_string(),
                MonitorState::Paused => "Chromium Extension Monitor - 已暂停".to_string(),
                MonitorState::Stopped => "Chromium Extension Monitor - 已停止".to_string(),
            };

            // 使用简单图标
            let icon = tray_icon::Icon::from_rgba(
                vec![0, 0, 0, 255].repeat(32 * 32),
                32,
                32,
            ).unwrap();
            tray.set_icon(Some(icon)).ok();
        }
    }

    /// 显示通知（暂不实现，依赖平台特定 API）
    pub fn show_notification(&self, title: &str, body: &str) {
        tracing::info!("[托盘通知] {}: {}", title, body);
        // 注意：tray-icon crate 的通知功能需要平台特定实现
        // 暂时使用日志代替
    }

    /// 隐藏托盘
    pub fn hide(&mut self) {
        self.tray_icon = None;
    }
}

impl Drop for TrayManager {
    fn drop(&mut self) {
        info!("销毁托盘管理器");
        self.tray_icon = None;
    }
}

/// 创建默认托盘（无菜单）
pub fn create_simple_tray() -> crate::Result<TrayIcon> {
    let icon = tray_icon::Icon::from_rgba(
        vec![0, 0, 0, 255].repeat(32 * 32),
        32,
        32,
    ).map_err(|e| {
        crate::error::TrayError::IconCreateFailed(format!("创建图标失败：{}", e))
    })?;

    let tray_icon = TrayIconBuilder::new()
        .with_icon(icon)
        .with_tooltip("Chromium Extension Monitor")
        .build()
        .map_err(|e| crate::error::TrayError::IconCreateFailed(format!("创建托盘失败：{}", e)))?;

    Ok(tray_icon)
}
