use serde::Serialize;

use super::{
    guild_worker::{AfkDates, ClockDates, WorkerRecord},
    roles::{GuildRolesDocument, RoleEntry},
    settings::GuildSettingsDocument,
};

#[derive(Debug, Clone, Serialize)]
pub struct GuildSettingsView {
    pub guild_id: String,
    pub log_channel_id: Option<String>,
    pub weekly_report_channel_id: Option<String>,
    pub plan: Option<String>,
    pub time_zone: Option<String>,
    pub target_hours: Option<i64>,
    pub max_afk_hours: Option<i64>,
    pub afk_reminders: Option<i64>,
    pub worker_voice_chats: Vec<String>,
    pub voice_exempt_role: Vec<String>,
    pub bot_admin_role: Vec<String>,
    pub weekly_exempt_role: Option<String>,
}

impl From<&GuildSettingsDocument> for GuildSettingsView {
    fn from(settings: &GuildSettingsDocument) -> Self {
        Self {
            guild_id: settings.guild_id.clone(),
            log_channel_id: settings.log_channel_id.clone(),
            weekly_report_channel_id: settings.weekly_report_channel_id.clone(),
            plan: settings.plan.clone(),
            time_zone: settings.time_zone.clone(),
            target_hours: settings.target_hours,
            max_afk_hours: settings.max_afk_hours,
            afk_reminders: settings.afk_reminders,
            worker_voice_chats: settings.worker_voice_chats.clone(),
            voice_exempt_role: settings.voice_exempt_role.clone(),
            bot_admin_role: settings.bot_admin_role.clone(),
            weekly_exempt_role: settings.weekly_exempt_role.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct RoleEntryView {
    pub name: String,
    pub hourly_salary: std::collections::HashMap<String, f64>,
    pub category: String,
    pub id: String,
    pub experiences: Vec<String>,
}

impl From<&RoleEntry> for RoleEntryView {
    fn from(role: &RoleEntry) -> Self {
        Self {
            name: role.name.clone(),
            hourly_salary: role.hourly_salary.clone(),
            category: role.category.clone(),
            id: role.id.clone(),
            experiences: role.experiences.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct GuildRolesView {
    pub guild_id: String,
    pub roles: Vec<RoleEntryView>,
    pub categories: Vec<String>,
    pub experiences: Vec<String>,
}

impl From<&GuildRolesDocument> for GuildRolesView {
    fn from(doc: &GuildRolesDocument) -> Self {
        Self {
            guild_id: doc.guild_id.clone(),
            roles: doc.roles.iter().map(RoleEntryView::from).collect(),
            categories: doc.categories.clone(),
            experiences: doc.experiences.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ClockDatesView {
    pub clock_in: Vec<i64>,
    pub clock_out: Vec<i64>,
    pub clock_summary: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AfkDatesView {
    pub afk_in: Vec<i64>,
    pub afk_out: Vec<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WorkerView {
    pub user_id: String,
    pub status: String,
    pub role_id: String,
    pub experience: Option<String>,
    pub breaks_count: i32,
    pub break_time_hours: f64,
    pub worked_hours: Option<f64>,
    pub clock_in_message: Option<String>,
    pub clock_dates: ClockDatesView,
    pub afk_dates: AfkDatesView,
    pub daily_worked_hours: f64,
    pub weekly_worked_hours: f64,
    pub total_worked_hours: f64,
}

impl From<&WorkerRecord> for WorkerView {
    fn from(worker: &WorkerRecord) -> Self {
        Self {
            user_id: worker.user_id.clone(),
            status: worker.status.clone(),
            role_id: worker.role_id.clone(),
            experience: worker.experience.clone(),
            breaks_count: worker.breaks_count,
            break_time_hours: worker.break_time,
            worked_hours: worker.worked,
            clock_in_message: worker.clock_in_message.clone(),
            clock_dates: ClockDatesView::from(&worker.clock_dates),
            afk_dates: AfkDatesView::from(&worker.afk_dates),
            daily_worked_hours: worker.daily_worked,
            weekly_worked_hours: worker.weekly_worked,
            total_worked_hours: worker.total_worked,
        }
    }
}

impl From<&ClockDates> for ClockDatesView {
    fn from(clock_dates: &ClockDates) -> Self {
        Self {
            clock_in: clock_dates.clock_in.clone(),
            clock_out: clock_dates.clock_out.clone(),
            clock_summary: clock_dates.clock_summary.clone(),
        }
    }
}

impl From<&AfkDates> for AfkDatesView {
    fn from(afk_dates: &AfkDates) -> Self {
        Self {
            afk_in: afk_dates.afk_in.clone(),
            afk_out: afk_dates.afk_out.clone(),
        }
    }
}
