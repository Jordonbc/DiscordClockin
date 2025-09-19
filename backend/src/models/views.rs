use serde::Serialize;

use super::guild_worker::{AfkDates, ClockDates, WorkerRecord};

#[derive(Debug, Clone, Serialize)]
pub struct ClockDatesView {
    pub clock_in: Vec<i64>,
    pub clock_out: Vec<i64>,
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
