use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GuildSettingsDocument {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    #[serde(rename = "guildId")]
    pub guild_id: String,
    #[serde(default, rename = "logChannelId")]
    pub log_channel_id: Option<String>,
    #[serde(default, rename = "weeklyReportChannelId")]
    pub weekly_report_channel_id: Option<String>,
    #[serde(default)]
    pub plan: Option<String>,
    #[serde(default, rename = "timeZone")]
    pub time_zone: Option<String>,
    #[serde(default, rename = "targetHours")]
    pub target_hours: Option<i64>,
    #[serde(default, rename = "maxAfkHours")]
    pub max_afk_hours: Option<i64>,
    #[serde(default, rename = "afkReminders")]
    pub afk_reminders: Option<i64>,
    #[serde(default, rename = "workerVoiceChats")]
    pub worker_voice_chats: Vec<String>,
    #[serde(default, rename = "voiceExemptRole")]
    pub voice_exempt_role: Vec<String>,
    #[serde(default, rename = "botAdminRole")]
    pub bot_admin_role: Vec<String>,
    #[serde(default, rename = "weeklyExemptRole")]
    pub weekly_exempt_role: Option<String>,
}
