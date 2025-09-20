use std::sync::Arc;

use actix_web::{HttpResponse, get, web};
use chrono::Utc;
use log::{debug, info};
use serde::{Deserialize, Serialize};

use crate::{
    error::ApiError,
    logging::redact_user_id,
    models::{guild_worker::WorkerRecord, roles::GuildRolesDocument, views::WorkerView},
    repository::Repository,
    state::AppState,
};

#[derive(Debug, Serialize)]
pub struct TimesheetResponse {
    pub worker: WorkerView,
    pub sessions: Vec<ShiftSession>,
    pub active_session: Option<ActiveSession>,
    pub metrics: TimeMetrics,
    pub payroll: Option<PayrollSummary>,
}

#[derive(Debug, Serialize)]
pub struct ShiftSession {
    pub started_at_ms: i64,
    pub ended_at_ms: Option<i64>,
    pub duration_minutes: f64,
}

#[derive(Debug, Serialize)]
pub struct ActiveSession {
    pub started_at_ms: i64,
    pub duration_minutes: f64,
}

#[derive(Debug, Serialize)]
pub struct TimeMetrics {
    pub break_hours: f64,
    pub daily_hours: f64,
    pub weekly_hours: f64,
    pub total_hours: f64,
    pub session_minutes_accumulated: f64,
}

#[derive(Debug, Serialize)]
pub struct PayrollSummary {
    pub hourly_rate: f64,
    pub projected_weekly_pay: f64,
    pub projected_total_pay: f64,
}

#[derive(Debug, Deserialize)]
pub struct TimesheetPath {
    pub guild_id: String,
    pub user_id: String,
}

#[get("/timesheets/{guild_id}/{user_id}")]
pub async fn get_timesheet(
    state: web::Data<AppState>,
    path: web::Path<TimesheetPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();

    info!(
        "Retrieving timesheet for worker {} in guild {}",
        redact_user_id(&path.user_id),
        path.guild_id
    );

    let guild_workers = repository
        .find_workers(&path.guild_id)
        .await?
        .ok_or_else(|| ApiError::NotFound("Guild has no workers".into()))?;

    let worker = guild_workers
        .find_worker(&path.user_id)
        .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

    let worker_view = WorkerView::from(worker);
    let (sessions, active_session) = build_sessions(worker);
    let session_minutes_accumulated = sessions.iter().map(|s| s.duration_minutes).sum();

    let metrics = TimeMetrics {
        break_hours: worker.break_time,
        daily_hours: worker.daily_worked,
        weekly_hours: worker.weekly_worked,
        total_hours: worker.total_worked,
        session_minutes_accumulated,
    };

    let payroll = resolve_payroll(&repository, &path.guild_id, worker).await;

    debug!(
        "Calculated {} historical sessions for worker {} in guild {}",
        sessions.len(),
        redact_user_id(&path.user_id),
        path.guild_id
    );

    Ok(HttpResponse::Ok().json(TimesheetResponse {
        worker: worker_view,
        sessions,
        active_session,
        metrics,
        payroll,
    }))
}

fn build_sessions(worker: &WorkerRecord) -> (Vec<ShiftSession>, Option<ActiveSession>) {
    let mut sessions = Vec::new();
    let mut active = None;

    for (index, start) in worker.clock_dates.clock_in.iter().enumerate() {
        let end = worker.clock_dates.clock_out.get(index).cloned();
        match end {
            Some(ended_at) => {
                let duration = duration_minutes(*start, ended_at);
                sessions.push(ShiftSession {
                    started_at_ms: *start,
                    ended_at_ms: Some(ended_at),
                    duration_minutes: duration,
                });
            }
            None => {
                let now = Utc::now().timestamp_millis();
                let duration = duration_minutes(*start, now);
                active = Some(ActiveSession {
                    started_at_ms: *start,
                    duration_minutes: duration,
                });
                sessions.push(ShiftSession {
                    started_at_ms: *start,
                    ended_at_ms: None,
                    duration_minutes: duration,
                });
            }
        }
    }

    (sessions, active)
}

fn duration_minutes(start_ms: i64, end_ms: i64) -> f64 {
    ((end_ms - start_ms) as f64 / 1000.0 / 60.0).max(0.0)
}

async fn resolve_payroll(
    repository: &Arc<dyn Repository>,
    guild_id: &str,
    worker: &WorkerRecord,
) -> Option<PayrollSummary> {
    let roles_doc = repository.get_roles(guild_id).await.ok().flatten()?;

    let rate = worker
        .experience
        .as_ref()
        .and_then(|experience| lookup_rate(&roles_doc, &worker.role_id, experience))
        .or_else(|| lookup_rate_default(&roles_doc, &worker.role_id));

    rate.map(|hourly_rate| PayrollSummary {
        hourly_rate,
        projected_weekly_pay: hourly_rate * worker.weekly_worked,
        projected_total_pay: hourly_rate * worker.total_worked,
    })
}

fn lookup_rate<'a>(
    roles_doc: &'a GuildRolesDocument,
    role_id: &str,
    experience: &str,
) -> Option<f64> {
    roles_doc
        .roles
        .iter()
        .find(|role| role.id == role_id)
        .and_then(|role| {
            role.hourly_salary
                .iter()
                .find(|(key, _)| key.eq_ignore_ascii_case(experience))
                .map(|(_, value)| *value)
        })
}

fn lookup_rate_default(roles_doc: &GuildRolesDocument, role_id: &str) -> Option<f64> {
    roles_doc
        .roles
        .iter()
        .find(|role| role.id == role_id)
        .and_then(|role| role.hourly_salary.values().copied().next())
}
