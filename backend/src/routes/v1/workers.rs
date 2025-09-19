use std::sync::Arc;

use actix_web::{HttpResponse, get, post, web};
use serde::{Deserialize, Serialize};

use crate::{
    error::ApiError,
    models::{guild_worker::WorkerRecord, roles::GuildRolesDocument, views::WorkerView},
    repository::Repository,
    state::AppState,
};

#[derive(Debug, Serialize)]
pub struct ListWorkersResponse {
    pub workers: Vec<WorkerView>,
}

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
    let repository: Arc<dyn Repository> = state.repository.clone();

    let roles_doc = repository
        .get_roles(&payload.guild_id)
        .await?
        .ok_or_else(|| ApiError::Validation("No roles configured for guild".into()))?;

    validate_role_choice(&roles_doc, &payload.role_id, payload.experience.as_deref())?;

    let mut guild_workers = repository.get_or_init_workers(&payload.guild_id).await?;

    if guild_workers.find_worker(&payload.user_id).is_some() {
        return Err(ApiError::Conflict("Worker already registered".into()));
    }

    let new_worker = WorkerRecord::new(
        payload.user_id.clone(),
        payload.role_id.clone(),
        payload.experience.clone(),
    );

    guild_workers.workers.push(new_worker);

    repository.persist_workers(&guild_workers).await?;

    let worker = guild_workers
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

#[derive(Debug, Deserialize)]
pub struct WorkersPath {
    pub guild_id: String,
}

#[get("/workers/{guild_id}")]
pub async fn list_workers(
    state: web::Data<AppState>,
    path: web::Path<WorkersPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();

    let doc = repository
        .find_workers(&path.guild_id)
        .await?
        .ok_or_else(|| ApiError::NotFound("Guild has no workers".into()))?;

    let workers = doc.workers.iter().map(WorkerView::from).collect::<Vec<_>>();

    Ok(HttpResponse::Ok().json(ListWorkersResponse { workers }))
}

#[get("/workers/{guild_id}/{user_id}")]
pub async fn get_worker(
    state: web::Data<AppState>,
    path: web::Path<WorkerPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();

    let doc = repository
        .find_workers(&path.guild_id)
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
