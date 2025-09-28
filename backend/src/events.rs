use std::collections::HashSet;

use serde::Serialize;
use tokio::sync::broadcast;

use crate::models::views::WorkerView;

#[derive(Debug, Clone, Serialize)]
pub struct HookEvent {
    pub action: String,
    pub guild_id: String,
    pub user_id: String,
    pub timestamp_ms: i64,
    pub worker: WorkerView,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

impl HookEvent {
    pub fn action_name(&self) -> &str {
        self.action.as_str()
    }

    pub fn matches_action(&self, actions: &HashSet<String>) -> bool {
        if actions.is_empty() {
            return true;
        }
        actions.contains(self.action_name())
    }
}

#[derive(Clone)]
pub struct EventBroadcaster {
    sender: broadcast::Sender<HookEvent>,
}

impl EventBroadcaster {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<HookEvent> {
        self.sender.subscribe()
    }

    pub fn publish(&self, event: HookEvent) {
        let _ = self.sender.send(event);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_action_allows_empty_filter() {
        let worker = WorkerView {
            user_id: "user".into(),
            status: "Work".into(),
            role_id: "role".into(),
            experience: None,
            breaks_count: 0,
            break_time_hours: 0.0,
            worked_hours: Some(0.0),
            clock_in_message: None,
            clock_dates: crate::models::views::ClockDatesView {
                clock_in: vec![],
                clock_out: vec![],
                clock_summary: vec![],
            },
            afk_dates: crate::models::views::AfkDatesView {
                afk_in: vec![],
                afk_out: vec![],
            },
            daily_worked_hours: 0.0,
            weekly_worked_hours: 0.0,
            total_worked_hours: 0.0,
            first_name: None,
            last_name: None,
            pronouns: None,
            location: None,
            timezone: None,
            bio: None,
        };

        let event = HookEvent {
            action: "clock_in".into(),
            guild_id: "guild".into(),
            user_id: "user".into(),
            timestamp_ms: 0,
            worker,
            summary: None,
            source: None,
        };

        let filter = HashSet::new();
        assert!(event.matches_action(&filter));
    }
}
