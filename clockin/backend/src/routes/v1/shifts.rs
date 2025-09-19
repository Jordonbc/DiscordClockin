use actix_web::{HttpResponse, post, web};
use chrono::Utc;
use mongodb::{
    Collection,
    bson::{Bson, doc},
};
use serde::{Deserialize, Serialize};

use crate::{
    error::ApiError,
    models::{guild_worker::GuildWorkersDocument, views::WorkerView},
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
    let collection = state.workers_collection();
    let mut workers = fetch_or_create_workers(&collection, &payload.guild_id).await?;
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

    persist_workers(&collection, &workers).await?;

    if let Some(message_id) = &payload.clock_in_message_id {
        upsert_clockin_message(&state, &payload.guild_id, &payload.user_id, message_id).await?;
    }

    let worker_view = workers
        .find_worker(&payload.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

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
    let collection = state.workers_collection();
    let mut workers = fetch_or_create_workers(&collection, &payload.guild_id).await?;
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

    persist_workers(&collection, &workers).await?;

    state
        .clockins_collection()
        .delete_one(doc! { "guildId": &payload.guild_id, "userId": &payload.user_id })
        .await?;

    let worker_view = workers
        .find_worker(&payload.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

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
    let collection = state.workers_collection();
    let mut workers = fetch_or_create_workers(&collection, &payload.guild_id).await?;
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

    persist_workers(&collection, &workers).await?;

    let worker_view = workers
        .find_worker(&payload.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

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
    let collection = state.workers_collection();
    let mut workers = fetch_or_create_workers(&collection, &payload.guild_id).await?;
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

    persist_workers(&collection, &workers).await?;

    let worker_view = workers
        .find_worker(&payload.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

    Ok(HttpResponse::Ok().json(ShiftEventResponse {
        action: "break_end".into(),
        timestamp_ms: now,
        worker: worker_view,
    }))
}

fn current_timestamp_ms() -> i64 {
    Utc::now().timestamp_millis()
}

async fn fetch_or_create_workers(
    collection: &Collection<GuildWorkersDocument>,
    guild_id: &str,
) -> Result<GuildWorkersDocument, ApiError> {
    if let Some(doc) = collection.find_one(doc! { "guildId": guild_id }).await? {
        return Ok(doc);
    }

    let mut doc = GuildWorkersDocument {
        id: None,
        guild_id: guild_id.to_string(),
        workers: Vec::new(),
    };

    let insert_result = collection.insert_one(&doc).await?;
    if let Bson::ObjectId(id) = insert_result.inserted_id {
        doc.id = Some(id);
    }

    Ok(doc)
}

async fn persist_workers(
    collection: &Collection<GuildWorkersDocument>,
    document: &GuildWorkersDocument,
) -> Result<(), ApiError> {
    collection
        .replace_one(doc! { "guildId": &document.guild_id }, document)
        .await?;
    Ok(())
}

async fn upsert_clockin_message(
    state: &AppState,
    guild_id: &str,
    user_id: &str,
    message_id: &str,
) -> Result<(), ApiError> {
    let collection = state.clockins_collection();
    let filter = doc! {
        "guildId": guild_id,
        "userId": user_id,
    };
    let update = doc! {
        "$set": {
            "guildId": guild_id,
            "userId": user_id,
            "messageId": message_id,
        }
    };
    collection.update_one(filter, update).upsert(true).await?;
    Ok(())
}
