use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NoticeKind {
    Waiting,
    Lost,
    Fault,
    Test,
    Clear,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notice {
    pub kind: NoticeKind,
    pub title: String,
    pub body: String,
}
impl Notice {
    pub fn test() -> Self {
        Self {
            kind: NoticeKind::Test,
            title: "通知测试".into(),
            body: "专注守护可以调用 Windows 通知。请确认通知中心或屏幕上是否显示这条提醒。".into(),
        }
    }
    pub fn clear_for_cleanup() -> Self {
        Self {
            kind: NoticeKind::Clear,
            title: String::new(),
            body: String::new(),
        }
    }
}

/// Generates one event per incident/state transition, not per display refresh.
#[derive(Default)]
pub struct NoticePolicy {
    identity: Option<u64>,
    waiting_since: Option<u64>,
    waiting_sent: bool,
    last_key: Option<String>,
    visible: bool,
    incident: u64,
    was_warning: bool,
}
impl NoticePolicy {
    pub fn incident(&self) -> u64 {
        self.incident
    }
    pub fn observe(&mut self, status: &Value, now: u64) -> Vec<Notice> {
        let state = status["state"].as_str().unwrap_or("idle");
        let identity = status["targetPid"].as_u64();
        let active = status["watchdogRunning"] == true
            && (status["enabled"] == true || state == "faulted")
            && !matches!(state, "paused" | "idle");
        let warning = active && matches!(state, "gracePeriod" | "closing" | "wouldClose");
        if warning && (!self.was_warning || self.identity != identity) {
            self.incident += 1;
        }
        self.was_warning = warning;
        if !active || matches!(state, "monitoring" | "terminating") {
            self.waiting_since = None;
            self.waiting_sent = false;
            self.last_key = None;
            self.identity = identity;
            if self.visible {
                self.visible = false;
                return vec![Notice::clear_for_cleanup()];
            }
            return vec![];
        }
        if self.identity != identity {
            self.waiting_since = None;
            self.waiting_sent = false;
            self.last_key = None;
        }
        self.identity = identity;
        let notice = match state {
            "awaitingExtension" => {
                let since = *self.waiting_since.get_or_insert(now);
                if now.saturating_sub(since) < 3000 || self.waiting_sent {
                    return vec![];
                }
                self.waiting_sent = true;
                Notice {
                    kind: NoticeKind::Waiting,
                    title: "尚未检测到专注扩展".into(),
                    body: "请确认登记的浏览器已加载扩展，并开启与本地监控程序的通信。".into(),
                }
            }
            "gracePeriod" | "closing" | "wouldClose" => {
                let reason = status["reason"].as_str().unwrap_or("connectionLost");
                let key = format!("lost:{reason}");
                if self.last_key.as_deref() == Some(&key) {
                    return vec![];
                }
                self.last_key = Some(key);
                let seconds = status["remainingMs"].as_u64().unwrap_or(0).div_ceil(1000);
                let cause = match reason {
                    "heartbeatTimeout" => "扩展连接无响应",
                    "extensionNotConnected" => "仍未检测到专注扩展",
                    _ => "专注扩展连接已中断",
                };
                let consequence = if status["dryRun"] == true {
                    "当前为模拟模式，不会关闭浏览器。".into()
                } else {
                    format!("请在 {seconds} 秒内恢复，否则将关闭登记的浏览器实例。")
                };
                Notice {
                    kind: NoticeKind::Lost,
                    title: cause.into(),
                    body: consequence,
                }
            }
            "faulted" => {
                let reason = status["reason"].as_str().unwrap_or("未知错误");
                let key = format!("fault:{reason}");
                if self.last_key.as_deref() == Some(&key) {
                    return vec![];
                }
                self.last_key = Some(key);
                Notice {
                    kind: NoticeKind::Fault,
                    title: "专注守护需要处理".into(),
                    body: format!("{} 请打开状态窗口查看诊断。", friendly_error(reason)),
                }
            }
            _ => return vec![],
        };
        self.visible = true;
        vec![notice]
    }
}

pub fn friendly_error(reason: &str) -> &str {
    if reason.contains("origin") || reason.contains("extension ID") {
        "扩展 ID 与本地登记不一致。"
    } else if reason.contains("already running") {
        "监控程序已经在运行。"
    } else if reason.contains("config") || reason.contains("version") {
        "配置无法读取或版本不兼容。"
    } else if reason.contains("elevated")
        || reason.contains("denied")
        || reason.contains("os error 5")
    {
        "无法访问浏览器，请检查是否以管理员身份运行了浏览器。"
    } else if reason.contains("handshake") {
        "尚未完成扩展连接验证，请先打开浏览器并启用通信。"
    } else if reason.contains("registration") || reason.contains("another installation") {
        "浏览器登记存在冲突，请查看诊断详情。"
    } else {
        "本地监控遇到问题。"
    }
}

pub fn escape_xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn status(state: &str) -> Value {
        json!({"state":state,"enabled":true,"watchdogRunning":true,"targetPid":42,"remainingMs":5000,"reason":"connectionLost"})
    }
    #[test]
    fn ordinary_startup_does_not_spam_and_long_wait_notifies_once() {
        let mut p = NoticePolicy::default();
        let s = status("awaitingExtension");
        assert!(p.observe(&s, 0).is_empty());
        assert!(p.observe(&s, 2999).is_empty());
        assert_eq!(p.observe(&s, 3000)[0].kind, NoticeKind::Waiting);
        assert!(p.observe(&s, 3001).is_empty());
    }
    #[test]
    fn a_single_incident_is_not_resent_for_every_countdown_tick() {
        let mut p = NoticePolicy::default();
        let mut s = status("gracePeriod");
        assert_eq!(p.observe(&s, 0)[0].kind, NoticeKind::Lost);
        let id = p.incident();
        s["remainingMs"] = 1000.into();
        assert!(p.observe(&s, 4000).is_empty());
        assert_eq!(p.incident(), id);
        assert_eq!(
            p.observe(&status("monitoring"), 4100)[0].kind,
            NoticeKind::Clear
        );
        assert_eq!(
            p.observe(&status("gracePeriod"), 4200)[0].kind,
            NoticeKind::Lost
        );
        assert!(p.incident() > id);
    }
    #[test]
    fn pause_or_exit_clears_notifications_and_never_reports_missing_extension() {
        let mut p = NoticePolicy::default();
        p.observe(&status("gracePeriod"), 0);
        assert_eq!(p.observe(&status("paused"), 100)[0].kind, NoticeKind::Clear);
        assert!(p.observe(&status("idle"), 200).is_empty());
    }
    #[test]
    fn faults_are_deduplicated_separately_from_missing_extension() {
        let mut p = NoticePolicy::default();
        let mut s = status("faulted");
        s["reason"] = "configuration error".into();
        assert_eq!(p.observe(&s, 0)[0].kind, NoticeKind::Fault);
        assert!(p.observe(&s, 100).is_empty());
    }
    #[test]
    fn xml_cannot_be_changed_by_error_or_directory_text() {
        assert_eq!(escape_xml("<&\"'>"), "&lt;&amp;&quot;&apos;&gt;");
    }
}
