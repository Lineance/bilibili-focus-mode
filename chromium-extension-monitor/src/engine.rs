use crate::config::Timing;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceId {
    pub pid: u32,
    pub created: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum State {
    Idle,
    AwaitingExtension,
    Monitoring,
    GracePeriod,
    Closing,
    Terminating,
    Paused,
    Faulted,
    WouldClose,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Action {
    Warning { reason: &'static str, deadline: u64 },
    RequestClose(InstanceId),
    Terminate(InstanceId),
    WouldClose(InstanceId),
}

/// Pure state machine: all timestamps are elapsed active milliseconds supplied by
/// the caller. Wall clock time and OS side effects cannot influence decisions.
#[derive(Debug)]
pub struct Engine {
    pub state: State,
    pub instance: Option<InstanceId>,
    pub session: Option<String>,
    pub deadline: Option<u64>,
    pub reason: Option<String>,
    timing: Timing,
    enabled: bool,
    last_heartbeat: u64,
    dry_run: bool,
}
impl Engine {
    pub fn new(timing: Timing, enabled: bool, dry_run: bool) -> Self {
        Self {
            state: if enabled { State::Idle } else { State::Paused },
            instance: None,
            session: None,
            deadline: None,
            reason: None,
            timing,
            enabled,
            last_heartbeat: 0,
            dry_run,
        }
    }
    pub fn observe(&mut self, instance: Option<InstanceId>, now: u64) {
        if self.instance == instance {
            return;
        }
        self.instance = instance;
        self.session = None;
        self.reason = None;
        self.deadline = if self.enabled && self.instance.is_some() {
            Some(now + self.timing.startup_ms)
        } else {
            None
        };
        self.state = if !self.enabled {
            State::Paused
        } else if self.instance.is_some() {
            State::AwaitingExtension
        } else {
            State::Idle
        };
    }
    pub fn set_enabled(&mut self, enabled: bool, now: u64) {
        if enabled == self.enabled {
            return;
        }
        self.enabled = enabled;
        self.reason = None;
        self.deadline = None;
        self.state = if !enabled {
            State::Paused
        } else if self.instance.is_none() {
            State::Idle
        } else if self.session.is_some()
            && now.saturating_sub(self.last_heartbeat) < self.timing.heartbeat_timeout_ms
        {
            State::Monitoring
        } else {
            self.deadline = Some(now + self.timing.startup_ms);
            State::AwaitingExtension
        };
    }
    pub fn connected(&mut self, instance: &InstanceId, session: String, now: u64) -> bool {
        if self.instance.as_ref() != Some(instance)
            || matches!(self.state, State::Terminating | State::Faulted)
        {
            return false;
        }
        self.session = Some(session);
        self.last_heartbeat = now;
        self.deadline = None;
        self.reason = None;
        self.state = if self.enabled {
            State::Monitoring
        } else {
            State::Paused
        };
        true
    }
    pub fn heartbeat(&mut self, session: &str, now: u64) {
        if self.session.as_deref() != Some(session)
            || matches!(self.state, State::Faulted | State::Terminating)
        {
            return;
        }
        self.last_heartbeat = now;
        if self.enabled
            && matches!(
                self.state,
                State::GracePeriod | State::AwaitingExtension | State::WouldClose
            )
        {
            self.state = State::Monitoring;
            self.deadline = None;
            self.reason = None;
        }
    }
    pub fn disconnected(&mut self, session: &str, now: u64) -> Vec<Action> {
        if self.session.as_deref() != Some(session) {
            return vec![];
        }
        self.session = None;
        if self.enabled && self.state == State::Monitoring {
            self.warn("connectionLost", now)
        } else {
            vec![]
        }
    }
    fn warn(&mut self, reason: &'static str, now: u64) -> Vec<Action> {
        self.state = State::GracePeriod;
        self.reason = Some(reason.into());
        let deadline = now + self.timing.grace_ms;
        self.deadline = Some(deadline);
        vec![Action::Warning { reason, deadline }]
    }
    /// Resume opens one bounded recovery window. Existing live sessions can
    /// recover it with a fresh heartbeat; stale disconnects never extend it.
    pub fn resumed(&mut self, now: u64) {
        if !self.enabled || self.instance.is_none() || self.state == State::Terminating {
            return;
        }
        self.state = State::AwaitingExtension;
        self.deadline = Some(now + self.timing.resume_ms);
        self.reason = Some("systemResumed".into());
    }
    pub fn fault(&mut self, reason: String) {
        self.state = State::Faulted;
        self.reason = Some(reason);
        self.deadline = None;
    }
    pub fn tick(&mut self, now: u64) -> Vec<Action> {
        if !self.enabled {
            return vec![];
        }
        match self.state {
            State::Monitoring
                if now.saturating_sub(self.last_heartbeat) >= self.timing.heartbeat_timeout_ms =>
            {
                self.warn("heartbeatTimeout", now)
            }
            State::AwaitingExtension if self.deadline.is_some_and(|end| now >= end) => {
                self.warn("extensionNotConnected", now)
            }
            State::GracePeriod if self.deadline.is_some_and(|end| now >= end) => {
                let Some(instance) = self.instance.clone() else {
                    return vec![];
                };
                if self.dry_run {
                    self.state = State::WouldClose;
                    self.deadline = None;
                    vec![Action::WouldClose(instance)]
                } else {
                    self.state = State::Closing;
                    self.deadline = Some(now + self.timing.close_wait_ms);
                    vec![Action::RequestClose(instance)]
                }
            }
            State::Closing if self.deadline.is_some_and(|end| now >= end) => {
                self.state = State::Terminating;
                self.deadline = None;
                self.instance
                    .clone()
                    .map(Action::Terminate)
                    .into_iter()
                    .collect()
            }
            _ => vec![],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn id(pid: u32) -> InstanceId {
        InstanceId { pid, created: 10 }
    }
    fn engine(dry: bool) -> Engine {
        let mut e = Engine::new(
            Timing {
                startup_ms: 1000,
                heartbeat_timeout_ms: 1000,
                grace_ms: 500,
                close_wait_ms: 200,
                resume_ms: 900,
            },
            true,
            dry,
        );
        e.observe(Some(id(1)), 0);
        e
    }
    #[test]
    fn startup_without_any_host_closes_after_two_distinct_deadlines() {
        let mut e = engine(false);
        assert!(e.tick(999).is_empty());
        assert!(matches!(e.tick(1000)[0], Action::Warning { .. }));
        assert_eq!(e.tick(1500), vec![Action::RequestClose(id(1))]);
        assert!(e.tick(1699).is_empty());
        assert_eq!(e.tick(1700), vec![Action::Terminate(id(1))]);
        assert!(e.tick(99999).is_empty());
    }
    #[test]
    fn reconnect_cancels_deadline_and_old_disconnect_is_ignored() {
        let mut e = engine(false);
        e.connected(&id(1), "old".into(), 0);
        e.disconnected("old", 100);
        e.connected(&id(1), "new".into(), 599);
        e.disconnected("old", 600);
        assert!(e.tick(700).is_empty());
        assert_eq!(e.state, State::Monitoring);
    }
    #[test]
    fn repeated_disconnect_does_not_extend_grace() {
        let mut e = engine(false);
        e.connected(&id(1), "s".into(), 0);
        e.disconnected("s", 100);
        e.disconnected("s", 500);
        assert_eq!(e.tick(600), vec![Action::RequestClose(id(1))]);
    }
    #[test]
    fn heartbeat_recovers_stalled_but_live_session() {
        let mut e = engine(false);
        e.connected(&id(1), "s".into(), 0);
        e.tick(1000);
        e.heartbeat("s", 1499);
        assert!(e.tick(1500).is_empty());
        assert_eq!(e.state, State::Monitoring);
    }
    #[test]
    fn old_browser_events_cannot_arm_reused_pid() {
        let mut e = engine(false);
        e.connected(&id(1), "s".into(), 0);
        e.disconnected("s", 100);
        let reused = InstanceId {
            pid: 1,
            created: 11,
        };
        e.observe(Some(reused), 500);
        assert!(!e.connected(&id(1), "old".into(), 600));
        assert!(e.tick(600).is_empty());
        assert_eq!(e.state, State::AwaitingExtension);
    }
    #[test]
    fn normal_exit_removes_all_pending_actions() {
        let mut e = engine(false);
        e.tick(1000);
        e.observe(None, 1499);
        assert!(e.tick(99999).is_empty());
        assert_eq!(e.state, State::Idle);
    }
    #[test]
    fn local_pause_cancels_close_and_can_resume_with_live_heartbeat() {
        let mut e = engine(false);
        e.connected(&id(1), "s".into(), 0);
        e.tick(1000);
        e.set_enabled(false, 1100);
        assert!(e.tick(1500).is_empty());
        e.heartbeat("s", 1600);
        e.set_enabled(true, 1700);
        assert_eq!(e.state, State::Monitoring);
    }
    #[test]
    fn system_resume_never_immediately_forces_termination() {
        let mut e = engine(false);
        e.tick(1000);
        e.tick(1500);
        e.resumed(50000);
        assert!(e.tick(50000).is_empty());
        assert!(matches!(e.tick(50900)[0], Action::Warning { .. }));
    }
    #[test]
    fn dry_run_and_faults_never_invoke_real_close() {
        let mut e = engine(true);
        e.tick(1000);
        assert_eq!(e.tick(1500), vec![Action::WouldClose(id(1))]);
        assert!(e.tick(99999).is_empty());
        e.fault("ambiguous identity".into());
        assert!(e.tick(100000).is_empty());
    }
    #[test]
    fn invalid_session_heartbeats_do_not_postpone_timeout() {
        let mut e = engine(false);
        e.connected(&id(1), "new".into(), 0);
        e.heartbeat("old", 999);
        assert!(matches!(e.tick(1000)[0], Action::Warning { .. }));
    }
}
