use std::sync::Arc;

use actix_web::{HttpResponse, post, web};
use chrono::Utc;
use log::{debug, info};
use serde::{Deserialize, Serialize};

use crate::{
    error::ApiError,
    logging::redact_user_id,
    models::{clockins::ClockInMessageDocument, views::WorkerView},
    repository::Repository,
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct StartShiftRequest {
    pub guild_id: String,
    pub user_id: String,
    pub clock_in_message_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ShiftEventResponse {
    pub action: String,
    pub timestamp_ms: i64,
    pub worker: WorkerView,
}

#[post("/shifts/start")]
pub async fn start_shift(
    state: web::Data<AppState>,
    payload: web::Json<StartShiftRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let payload = payload.into_inner();
    info!(
        "Starting shift for worker {} in guild {}",
        redact_user_id(&payload.user_id),
        payload.guild_id
    );

    let mut workers = repository.get_or_init_workers(&payload.guild_id).await?;
    let now = current_timestamp_ms();

    {
        let worker = workers
            .find_worker_mut(&payload.user_id)
            .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

        if matches!(worker.status.as_str(), "Work" | "Break") {
            return Err(ApiError::Conflict(
                "Worker is already clocked in or currently on break".into(),
            ));
        }

        worker.mark_clock_in(now, payload.clock_in_message_id.clone());
    }

    repository.persist_workers(&workers).await?;

    if let Some(message_id) = &payload.clock_in_message_id {
        debug!(
            "Associating clock-in message {} for worker {} in guild {}",
            message_id,
            redact_user_id(&payload.user_id),
            payload.guild_id
        );
        let record = ClockInMessageDocument {
            id: None,
            guild_id: payload.guild_id.clone(),
            user_id: payload.user_id.clone(),
            message_id: message_id.clone(),
        };
        repository.upsert_clockin_message(&record).await?;
    }

    let worker_view = workers
        .find_worker(&payload.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

    debug!(
        "Worker {} clocked in at {now} for guild {}",
        redact_user_id(&payload.user_id),
        payload.guild_id
    );

    Ok(HttpResponse::Ok().json(ShiftEventResponse {
        action: "clock_in".into(),
        timestamp_ms: now,
        worker: worker_view,
    }))
}

#[derive(Debug, Deserialize)]
pub struct EndShiftRequest {
    pub guild_id: String,
    pub user_id: String,
}

#[post("/shifts/end")]
pub async fn end_shift(
    state: web::Data<AppState>,
    payload: web::Json<EndShiftRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let payload = payload.into_inner();
    info!(
        "Ending shift for worker {} in guild {}",
        redact_user_id(&payload.user_id),
        payload.guild_id
    );

    let mut workers = repository.get_or_init_workers(&payload.guild_id).await?;
    let now = current_timestamp_ms();

    {
        let worker = workers
            .find_worker_mut(&payload.user_id)
            .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

        if worker.status.eq_ignore_ascii_case("Offline") {
            return Err(ApiError::Conflict("Worker is not clocked in".into()));
        }

        worker.mark_clock_out(now);
    }

    repository.persist_workers(&workers).await?;
    repository
        .delete_clockin_message(&payload.guild_id, &payload.user_id)
        .await?;

    let worker_view = workers
        .find_worker(&payload.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

    debug!(
        "Worker {} clocked out at {now} for guild {}",
        redact_user_id(&payload.user_id),
        payload.guild_id
    );

    Ok(HttpResponse::Ok().json(ShiftEventResponse {
        action: "clock_out".into(),
        timestamp_ms: now,
        worker: worker_view,
    }))
}

#[derive(Debug, Deserialize)]
pub struct BreakRequest {
    pub guild_id: String,
    pub user_id: String,
}

#[post("/shifts/break/start")]
pub async fn start_break(
    state: web::Data<AppState>,
    payload: web::Json<BreakRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let payload = payload.into_inner();
    info!(
        "Starting break for worker {} in guild {}",
        redact_user_id(&payload.user_id),
        payload.guild_id
    );

    let mut workers = repository.get_or_init_workers(&payload.guild_id).await?;
    let now = current_timestamp_ms();

    {
        let worker = workers
            .find_worker_mut(&payload.user_id)
            .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

        if !worker.status.eq_ignore_ascii_case("Work") {
            return Err(ApiError::Conflict(
                "Worker is not currently clocked in".into(),
            ));
        }

        worker.mark_break_start(now);
    }

    repository.persist_workers(&workers).await?;

    let worker_view = workers
        .find_worker(&payload.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

    debug!(
        "Worker {} started break at {now} for guild {}",
        redact_user_id(&payload.user_id),
        payload.guild_id
    );

    Ok(HttpResponse::Ok().json(ShiftEventResponse {
        action: "break_start".into(),
        timestamp_ms: now,
        worker: worker_view,
    }))
}

#[post("/shifts/break/end")]
pub async fn end_break(
    state: web::Data<AppState>,
    payload: web::Json<BreakRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let payload = payload.into_inner();
    info!(
        "Ending break for worker {} in guild {}",
        redact_user_id(&payload.user_id),
        payload.guild_id
    );

    let mut workers = repository.get_or_init_workers(&payload.guild_id).await?;
    let now = current_timestamp_ms();

    {
        let worker = workers
            .find_worker_mut(&payload.user_id)
            .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

        if !worker.status.eq_ignore_ascii_case("Break") {
            return Err(ApiError::Conflict(
                "Worker is not currently on break".into(),
            ));
        }

        worker.mark_break_end(now);
    }

    repository.persist_workers(&workers).await?;

    let worker_view = workers
        .find_worker(&payload.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

    debug!(
        "Worker {} ended break at {now} for guild {}",
        redact_user_id(&payload.user_id),
        payload.guild_id
    );

    Ok(HttpResponse::Ok().json(ShiftEventResponse {
        action: "break_end".into(),
        timestamp_ms: now,
        worker: worker_view,
    }))
}

fn current_timestamp_ms() -> i64 {
    Utc::now().timestamp_millis()
}
