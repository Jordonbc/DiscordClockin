use actix_web::{get, post, web, HttpResponse};
use mongodb::{bson::{doc, to_bson}, options::UpdateOptions};
use serde::{Deserialize, Serialize};

use crate::{
    error::ApiError,
    models::{
        guild_worker::{GuildWorkersDocument, WorkerRecord},
        roles::GuildRolesDocument,
        views::WorkerView,
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct RegisterWorkerRequest {
    pub guild_id: String,
    pub user_id: String,
    pub role_id: String,
    pub experience: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RegisterWorkerResponse {
    pub worker: WorkerView,
}

#[post("/workers/register")]
pub async fn register_worker(
    state: web::Data<AppState>,
    payload: web::Json<RegisterWorkerRequest>,
) -> Result<HttpResponse, ApiError> {
    let roles_collection = state.roles_collection();
    let roles_doc = roles_collection
        .find_one(doc! { "guildId": &payload.guild_id }, None)
        .await?
        .ok_or_else(|| ApiError::Validation("No roles configured for guild".into()))?;

    validate_role_choice(&roles_doc, &payload.role_id, payload.experience.as_deref())?;

    let workers_collection = state.workers_collection();

    let existing_worker = workers_collection
        .find_one(doc! { "guildId": &payload.guild_id, "workers.userId": &payload.user_id }, None)
        .await?;

    if existing_worker.is_some() {
        return Err(ApiError::Conflict("Worker already registered".into()));
    }

    let new_worker = WorkerRecord::new(
        payload.user_id.clone(),
        payload.role_id.clone(),
        payload.experience.clone(),
    );

    let worker_bson = to_bson(&new_worker)
        .map_err(|_| ApiError::Validation("Failed to serialize worker".into()))?;
    let worker_doc = worker_bson
        .as_document()
        .cloned()
        .ok_or_else(|| ApiError::Internal)?;

    let filter = doc! { "guildId": &payload.guild_id };
    let update = doc! {
        "$setOnInsert": { "guildId": &payload.guild_id },
        "$push": { "workers": worker_doc }
    };
    let options = UpdateOptions::builder().upsert(true).build();

    workers_collection.update_one(filter, update, options).await?;

    let updated_doc = workers_collection
        .find_one(doc! { "guildId": &payload.guild_id }, None)
        .await?
        .ok_or_else(|| ApiError::Internal)?;

    let worker = updated_doc
        .find_worker(&payload.user_id)
        .ok_or_else(|| ApiError::Internal)?;

    Ok(HttpResponse::Ok().json(RegisterWorkerResponse {
        worker: WorkerView::from(worker),
    }))
}

#[derive(Debug, Deserialize)]
pub struct WorkerPath {
    pub guild_id: String,
    pub user_id: String,
}

#[get("/workers/{guild_id}/{user_id}")]
pub async fn get_worker(
    state: web::Data<AppState>,
    path: web::Path<WorkerPath>,
) -> Result<HttpResponse, ApiError> {
    let workers_collection = state.workers_collection();
    let doc = workers_collection
        .find_one(doc! { "guildId": &path.guild_id }, None)
        .await?
        .ok_or_else(|| ApiError::NotFound("Guild has no workers".into()))?;

    let worker = doc
        .find_worker(&path.user_id)
        .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

    Ok(HttpResponse::Ok().json(WorkerView::from(worker)))
}

fn validate_role_choice(
    roles_doc: &GuildRolesDocument,
    role_id: &str,
    experience: Option<&str>,
) -> Result<(), ApiError> {
    let role = roles_doc
        .roles
        .iter()
        .find(|role| role.id == role_id)
        .ok_or_else(|| ApiError::Validation("Role not found".into()))?;

    if let Some(exp) = experience {
        let is_valid = role
            .experiences
            .iter()
            .any(|candidate| candidate.eq_ignore_ascii_case(exp))
            || roles_doc
                .experiences
                .iter()
                .any(|candidate| candidate.eq_ignore_ascii_case(exp));

        if !is_valid {
            return Err(ApiError::Validation("Invalid experience level".into()));
        }
    }

    Ok(())
}
