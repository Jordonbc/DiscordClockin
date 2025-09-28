use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GuildWorkersDocument {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    #[serde(rename = "guildId")]
    pub guild_id: String,
    #[serde(default)]
    pub workers: Vec<WorkerRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WorkerRecord {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default, rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(default, rename = "globalName")]
    pub global_name: Option<String>,
    #[serde(default)]
    pub nickname: Option<String>,
    #[serde(default)]
    pub discriminator: Option<String>,
    #[serde(default, rename = "userTag")]
    pub user_tag: Option<String>,
    #[serde(default, rename = "clockDates")]
    pub clock_dates: ClockDates,
    #[serde(default, rename = "afkDates")]
    pub afk_dates: AfkDates,
    #[serde(default, rename = "onLeave")]
    pub on_leave: LeaveWindow,
    #[serde(default, rename = "clockInMessage")]
    pub clock_in_message: Option<String>,
    #[serde(default, rename = "afkMessage")]
    pub afk_message: Option<String>,
    #[serde(rename = "status")]
    pub status: String,
    #[serde(default)]
    pub experience: Option<String>,
    #[serde(rename = "roleId")]
    pub role_id: String,
    #[serde(default, rename = "breaksCount")]
    pub breaks_count: i32,
    #[serde(default)]
    pub worked: Option<f64>,
    #[serde(default, rename = "breakTime")]
    pub break_time: f64,
    #[serde(rename = "dailyWorked")]
    pub daily_worked: f64,
    #[serde(rename = "weeklyWorked")]
    pub weekly_worked: f64,
    #[serde(rename = "totalWorked")]
    pub total_worked: f64,
    #[serde(default, rename = "firstName")]
    pub first_name: Option<String>,
    #[serde(default, rename = "lastName")]
    pub last_name: Option<String>,
    #[serde(default)]
    pub pronouns: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default, rename = "timeZone")]
    pub timezone: Option<String>,
    #[serde(default)]
    pub bio: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ClockDates {
    #[serde(default, rename = "clockIn")]
    pub clock_in: Vec<i64>,
    #[serde(default, rename = "clockOut")]
    pub clock_out: Vec<i64>,
    #[serde(default, rename = "clockSummary")]
    pub clock_summary: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AfkDates {
    #[serde(default, rename = "afkIn")]
    pub afk_in: Vec<i64>,
    #[serde(default, rename = "afkOut")]
    pub afk_out: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LeaveWindow {
    #[serde(default)]
    pub start: Option<String>,
    #[serde(default)]
    pub end: Option<String>,
}

impl GuildWorkersDocument {
    pub fn find_worker_mut(&mut self, user_id: &str) -> Option<&mut WorkerRecord> {
        self.workers.iter_mut().find(|w| w.user_id == user_id)
    }

    pub fn find_worker(&self, user_id: &str) -> Option<&WorkerRecord> {
        self.workers.iter().find(|w| w.user_id == user_id)
    }
}

impl WorkerRecord {
    pub fn new(user_id: String, role_id: String, experience: Option<String>) -> Self {
        Self {
            user_id,
            username: None,
            display_name: None,
            global_name: None,
            nickname: None,
            discriminator: None,
            user_tag: None,
            clock_dates: ClockDates::default(),
            afk_dates: AfkDates::default(),
            on_leave: LeaveWindow::default(),
            clock_in_message: None,
            afk_message: None,
            status: "Offline".to_string(),
            experience,
            role_id,
            breaks_count: 0,
            worked: Some(0.0),
            break_time: 0.0,
            daily_worked: 0.0,
            weekly_worked: 0.0,
            total_worked: 0.0,
            first_name: None,
            last_name: None,
            pronouns: None,
            location: None,
            timezone: None,
            bio: None,
        }
    }

    pub fn mark_clock_in(&mut self, timestamp_ms: i64, message_id: Option<String>) {
        self.status = "Work".to_string();
        self.clock_dates.clock_in.push(timestamp_ms);
        if let Some(id) = message_id {
            self.clock_in_message = Some(id);
        }
    }

    pub fn mark_clock_out(&mut self, timestamp_ms: i64, summary: String) {
        self.status = "Offline".to_string();
        self.breaks_count = 0;
        self.worked = Some(0.0);
        self.break_time = 0.0;
        self.clock_dates.clock_out.push(timestamp_ms);
        self.clock_dates.clock_summary.push(summary);
        self.afk_dates.afk_in.clear();
        self.afk_dates.afk_out.clear();
    }

    pub fn mark_break_start(&mut self, timestamp_ms: i64) {
        self.status = "Break".to_string();
        self.breaks_count += 1;
        self.afk_dates.afk_in.push(timestamp_ms);
    }

    pub fn mark_break_end(&mut self, timestamp_ms: i64) {
        self.status = "Work".to_string();
        self.afk_dates.afk_out.push(timestamp_ms);
        if let (Some(afk_in), Some(afk_out)) =
            (self.afk_dates.afk_in.last(), self.afk_dates.afk_out.last())
        {
            let duration = (*afk_out - *afk_in) as f64 / 1000.0 / 60.0 / 60.0;
            self.break_time += duration.max(0.0);
        }
        self.afk_dates.afk_in.clear();
        self.afk_dates.afk_out.clear();
    }
}
