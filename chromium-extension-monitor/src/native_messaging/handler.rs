use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tracing::{debug, info, warn};

/// Native messaging handler state
pub struct NativeMessagingHandler {
    /// Last heartbeat timestamp from extension
    last_heartbeat: Arc<Mutex<Option<Instant>>>,

    /// Whether extension is considered connected
    extension_connected: Arc<Mutex<bool>>,

    /// Callback for when extension disconnects
    on_disconnect: Option<Arc<dyn Fn() + Send + Sync>>,
}

impl NativeMessagingHandler {
    /// Create a new handler
    pub fn new() -> Self {
        Self {
            last_heartbeat: Arc::new(Mutex::new(None)),
            extension_connected: Arc::new(Mutex::new(false)),
            on_disconnect: None,
        }
    }

    /// Set callback for when extension disconnects
    pub fn set_on_disconnect(&mut self, callback: impl Fn() + Send + Sync + 'static) {
        self.on_disconnect = Some(Arc::new(callback));
    }

    /// Get whether extension is connected
    pub fn is_extension_connected(&self) -> bool {
        *self.extension_connected.lock().unwrap()
    }

    /// Get last heartbeat time
    pub fn last_heartbeat(&self) -> Option<Instant> {
        *self.last_heartbeat.lock().unwrap()
    }

    /// Handle incoming message from extension
    pub fn handle_message(&self, message: Value) -> Value {
        let msg_type = message
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        debug!("NativeMessaging: Received message type: {}", msg_type);

        match msg_type {
            "heartbeat" => self.handle_heartbeat(),
            "ping" => self.handle_ping(),
            "extension-event" => self.handle_extension_event(message),
            "status-request" => self.handle_status_request(),
            _ => {
                warn!("NativeMessaging: Unknown message type: {}", msg_type);
                json!({
                    "type": "error",
                    "message": format!("Unknown message type: {}", msg_type),
                    "timestamp": chrono::Utc::now().to_rfc3339()
                })
            }
        }
    }

    /// Handle heartbeat message
    fn handle_heartbeat(&self) -> Value {
        // Update last heartbeat
        *self.last_heartbeat.lock().unwrap() = Some(Instant::now());

        // Mark as connected
        *self.extension_connected.lock().unwrap() = true;

        // Return pong
        json!({
            "type": "pong",
            "timestamp": chrono::Utc::now().to_rfc3339()
        })
    }

    /// Handle ping message
    fn handle_ping(&self) -> Value {
        json!({
            "type": "pong",
            "timestamp": chrono::Utc::now().to_rfc3339()
        })
    }

    /// Handle extension event message
    fn handle_extension_event(&self, message: Value) -> Value {
        let event_type = message
            .get("payload")
            .and_then(|p| p.get("type"))
            .and_then(|t| t.as_str())
            .unwrap_or("unknown");

        let version = message
            .get("payload")
            .and_then(|p| p.get("version"))
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        info!(
            "NativeMessaging: Extension event: {} (version: {})",
            event_type, version
        );

        json!({
            "type": "ack",
            "received": true,
            "event": event_type,
            "timestamp": chrono::Utc::now().to_rfc3339()
        })
    }

    /// Handle status request message
    fn handle_status_request(&self) -> Value {
        let connected = self.is_extension_connected();
        let last_heartbeat = self.last_heartbeat().map(|t| t.elapsed().as_secs());

        json!({
            "type": "status",
            "monitoring": true,
            "extension_connected": connected,
            "last_heartbeat_seconds_ago": last_heartbeat,
            "timestamp": chrono::Utc::now().to_rfc3339()
        })
    }

    /// Called when connection is lost (EOF on stdin)
    pub fn on_connection_lost(&self) {
        info!("NativeMessaging: Extension connection lost (EOF)");

        *self.extension_connected.lock().unwrap() = false;

        if let Some(callback) = &self.on_disconnect {
            callback();
        }
    }

    /// Check if heartbeat has timed out
    pub fn is_heartbeat_timeout(&self, timeout_secs: u64) -> bool {
        if let Some(last) = self.last_heartbeat() {
            last.elapsed().as_secs() > timeout_secs
        } else {
            // No heartbeat received yet, consider timeout
            true
        }
    }
}

impl Clone for NativeMessagingHandler {
    fn clone(&self) -> Self {
        Self {
            last_heartbeat: Arc::clone(&self.last_heartbeat),
            extension_connected: Arc::clone(&self.extension_connected),
            on_disconnect: self.on_disconnect.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_handler_initial_state() {
        let handler = NativeMessagingHandler::new();
        assert!(!handler.is_extension_connected());
        assert!(handler.last_heartbeat().is_none());
    }

    #[test]
    fn test_handle_heartbeat() {
        let handler = NativeMessagingHandler::new();

        let response = handler.handle_message(json!({"type": "heartbeat"}));

        assert_eq!(response.get("type").unwrap(), "pong");
        assert!(handler.is_extension_connected());
        assert!(handler.last_heartbeat().is_some());
    }

    #[test]
    fn test_handle_ping() {
        let handler = NativeMessagingHandler::new();

        let response = handler.handle_message(json!({"type": "ping"}));

        assert_eq!(response.get("type").unwrap(), "pong");
    }

    #[test]
    fn test_handle_unknown() {
        let handler = NativeMessagingHandler::new();

        let response = handler.handle_message(json!({"type": "unknown"}));

        assert_eq!(response.get("type").unwrap(), "error");
    }

    #[test]
    fn test_on_connection_lost() {
        let handler = NativeMessagingHandler::new();

        // First connect
        handler.handle_message(json!({"type": "heartbeat"}));
        assert!(handler.is_extension_connected());

        // Then disconnect
        handler.on_connection_lost();
        assert!(!handler.is_extension_connected());
    }
}
