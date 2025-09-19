use std::sync::Arc;

use actix_web::{HttpResponse, delete, post, web};
use log::{debug, info};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{error::ApiError, models::views::WorkerView, repository::Repository, state::AppState};

#[derive(Debug, Deserialize)]
pub struct WorkerRequest {
    pub guild_id: String,
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct GuildPath {
    pub guild_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HoursScope {
    Daily,
    Weekly,
    Total,
}

#[derive(Debug, Deserialize)]
pub struct ModifyHoursRequest {
    pub guild_id: String,
    pub user_id: String,
    pub hours: f64,
    pub scope: HoursScope,
}

#[derive(Debug, Serialize)]
pub struct WorkerMutationResponse {
    pub worker: WorkerView,
}

#[derive(Debug, Deserialize)]
pub struct ChangeRoleRequest {
    pub guild_id: String,
    pub user_id: String,
    pub role_id: String,
    pub experience: String,
}

#[derive(Debug, Serialize)]
pub struct DeleteSummary {
    pub removed: usize,
}

#[post("/workers/hours/add")]
pub async fn add_hours(
    state: web::Data<AppState>,
    payload: web::Json<ModifyHoursRequest>,
) -> Result<HttpResponse, ApiError> {
    modify_hours(state, payload.into_inner(), true).await
}

#[post("/workers/hours/remove")]
pub async fn remove_hours(
    state: web::Data<AppState>,
    payload: web::Json<ModifyHoursRequest>,
) -> Result<HttpResponse, ApiError> {
    modify_hours(state, payload.into_inner(), false).await
}

async fn modify_hours(
    state: web::Data<AppState>,
    body: ModifyHoursRequest,
    is_add: bool,
) -> Result<HttpResponse, ApiError> {
    if body.hours <= 0.0 {
        return Err(ApiError::Validation(
            "Hours must be greater than zero".into(),
        ));
    }

    info!(
        "{} {} hours ({:?}) for worker {} in guild {}",
        if is_add { "Adding" } else { "Removing" },
        body.hours,
        body.scope,
        body.user_id,
        body.guild_id
    );

    let repository: Arc<dyn Repository> = state.repository.clone();
    let mut workers = repository.get_or_init_workers(&body.guild_id).await?;

    {
        let worker = workers
            .find_worker_mut(&body.user_id)
            .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

        let delta = if is_add { body.hours } else { -body.hours };

        match body.scope {
            HoursScope::Daily => {
                worker.daily_worked += delta;
                worker.weekly_worked += delta;
                worker.total_worked += delta;
            }
            HoursScope::Weekly => {
                worker.weekly_worked += delta;
                worker.total_worked += delta;
            }
            HoursScope::Total => {
                worker.total_worked += delta;
            }
        }
    }

    repository.persist_workers(&workers).await?;

    let worker_view = workers
        .find_worker(&body.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

    debug!(
        "Updated hours for worker {} in guild {} -> daily: {}, weekly: {}, total: {}",
        body.user_id,
        body.guild_id,
        worker_view.daily_hours,
        worker_view.weekly_hours,
        worker_view.total_hours
    );

    Ok(HttpResponse::Ok().json(WorkerMutationResponse {
        worker: worker_view,
    }))
}

#[post("/workers/change-role")]
pub async fn change_role(
    state: web::Data<AppState>,
    payload: web::Json<ChangeRoleRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let payload = payload.into_inner();
    info!(
        "Changing role for worker {} in guild {} to {} ({})",
        payload.user_id, payload.guild_id, payload.role_id, payload.experience
    );
    let mut workers = repository.get_or_init_workers(&payload.guild_id).await?;
    let roles_doc = repository.get_or_init_roles(&payload.guild_id).await?;

    let worker = workers
        .find_worker_mut(&payload.user_id)
        .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

    let role = roles_doc
        .roles
        .iter()
        .find(|role| role.id.eq_ignore_ascii_case(&payload.role_id))
        .ok_or_else(|| ApiError::NotFound("Role not found".into()))?;

    let experience = resolve_experience(role.experiences.as_slice(), &payload.experience)
        .ok_or_else(|| ApiError::Validation("Experience not available on role".into()))?;

    if !role
        .hourly_salary
        .keys()
        .any(|key| key.eq_ignore_ascii_case(&experience))
    {
        return Err(ApiError::Validation(
            "Role does not define a hourly salary for that experience".into(),
        ));
    }

    worker.role_id = role.id.clone();
    worker.experience = Some(experience.clone());

    repository.persist_workers(&workers).await?;

    let worker_view = workers
        .find_worker(&payload.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

    debug!(
        "Worker {} in guild {} now assigned to role {} with experience {}",
        worker_view.user_id, payload.guild_id, worker_view.role_id, worker_view.experience
    );

    Ok(HttpResponse::Ok().json(WorkerMutationResponse {
        worker: worker_view,
    }))
}

#[delete("/workers/{guild_id}/{user_id}")]
pub async fn delete_worker(
    state: web::Data<AppState>,
    path: web::Path<WorkerRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!(
        "Deleting worker {} from guild {}",
        path.user_id, path.guild_id
    );
    let mut workers = repository.get_or_init_workers(&path.guild_id).await?;
    let index = workers
        .workers
        .iter()
        .position(|worker| worker.user_id == path.user_id)
        .ok_or_else(|| ApiError::NotFound("Worker not found".into()))?;

    let removed = workers.workers.remove(index);
    repository.persist_workers(&workers).await?;

    let view = WorkerView::from(&removed);

    debug!(
        "Worker {} removed from guild {}; remaining workers {}",
        view.user_id,
        path.guild_id,
        workers.workers.len()
    );

    Ok(HttpResponse::Ok().json(WorkerMutationResponse { worker: view }))
}

#[delete("/guilds/{guild_id}/workers")]
pub async fn delete_all_workers(
    state: web::Data<AppState>,
    path: web::Path<GuildPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!("Deleting all workers for guild {}", path.guild_id);
    let removed = repository
        .delete_workers(&path.guild_id)
        .await?
        .map(|doc| doc.workers.len())
        .unwrap_or(0);

    info!("Deleted {} workers for guild {}", removed, path.guild_id);
    Ok(HttpResponse::Ok().json(DeleteSummary { removed }))
}

#[delete("/guilds/{guild_id}/roles")]
pub async fn delete_all_roles(
    state: web::Data<AppState>,
    path: web::Path<GuildPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let removed = repository
        .delete_roles(&path.guild_id)
        .await?
        .map(|doc| doc.roles.len())
        .unwrap_or(0);

    Ok(HttpResponse::Ok().json(DeleteSummary { removed }))
}

#[delete("/guilds/{guild_id}/data")]
pub async fn delete_all_data(
    state: web::Data<AppState>,
    path: web::Path<GuildPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!("Deleting all data for guild {}", path.guild_id);

    let workers_removed = repository
        .delete_workers(&path.guild_id)
        .await?
        .map(|doc| doc.workers.len())
        .unwrap_or(0);
    let roles_removed = repository
        .delete_roles(&path.guild_id)
        .await?
        .map(|doc| doc.roles.len())
        .unwrap_or(0);
    repository.delete_settings(&path.guild_id).await?;

    info!(
        "Purged guild {} data: {} workers removed, {} roles removed",
        path.guild_id, workers_removed, roles_removed
    );

    Ok(HttpResponse::Ok().json(json!({
        "workers_removed": workers_removed,
        "roles_removed": roles_removed,
    })))
}

fn resolve_experience<'a>(experiences: &'a [String], target: &str) -> Option<String> {
    experiences
        .iter()
        .find(|candidate| candidate.eq_ignore_ascii_case(target))
        .cloned()
}
