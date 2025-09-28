use std::sync::Arc;

use actix_web::{HttpResponse, get, patch, web};
use log::info;
use serde::{Deserialize, Serialize};

use crate::{
    error::ApiError,
    logging::redact_user_id,
    models::{guild_worker::WorkerRecord, views::WorkerView},
    repository::Repository,
    state::AppState,
};

#[derive(Debug, Deserialize, Default)]
pub(crate) struct DiscordProfilePayload {
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default, alias = "displayName")]
    pub display_name: Option<String>,
    #[serde(default, alias = "globalName")]
    pub global_name: Option<String>,
    #[serde(default)]
    pub nickname: Option<String>,
    #[serde(default)]
    pub discriminator: Option<String>,
    #[serde(default, alias = "userTag")]
    pub user_tag: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub(crate) struct UpdateProfileRequest {
    #[serde(default)]
    pub first_name: Option<Option<String>>,
    #[serde(default)]
    pub last_name: Option<Option<String>>,
    #[serde(default)]
    pub pronouns: Option<Option<String>>,
    #[serde(default)]
    pub location: Option<Option<String>>,
    #[serde(default)]
    pub timezone: Option<Option<String>>,
    #[serde(default)]
    pub bio: Option<Option<String>>,
}

#[derive(Debug, Serialize)]
pub(crate) struct ProfileResponse {
    pub worker: WorkerView,
}

#[derive(Debug, Deserialize)]
pub(crate) struct ProfilePath {
    pub guild_id: String,
    pub user_id: String,
}

#[get("/profile/{guild_id}/{user_id}")]
pub(crate) async fn get_profile(
    state: web::Data<AppState>,
    path: web::Path<ProfilePath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let path = path.into_inner();

    let workers = repository
        .find_workers(&path.guild_id)
        .await?
        .ok_or_else(|| ApiError::NotFound("Guild has no workers".into()))?;

    let worker = workers
        .find_worker(&path.user_id)
        .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

    Ok(HttpResponse::Ok().json(ProfileResponse {
        worker: WorkerView::from(worker),
    }))
}

#[patch("/profile/{guild_id}/{user_id}")]
pub(crate) async fn update_profile(
    state: web::Data<AppState>,
    path: web::Path<ProfilePath>,
    payload: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let path = path.into_inner();
    let payload = payload.into_inner();

    info!(
        "Updating profile for worker {} in guild {}",
        redact_user_id(&path.user_id),
        path.guild_id
    );

    let mut workers = repository.get_or_init_workers(&path.guild_id).await?;
    let worker = workers
        .find_worker_mut(&path.user_id)
        .ok_or_else(|| ApiError::NotFound("Worker not registered".into()))?;

    apply_profile_overrides(worker, &payload);

    repository.persist_workers(&workers).await?;

    let updated = workers
        .find_worker(&path.user_id)
        .map(WorkerView::from)
        .ok_or(ApiError::Internal)?;

    Ok(HttpResponse::Ok().json(ProfileResponse { worker: updated }))
}

pub(crate) fn apply_profile_update(worker: &mut WorkerRecord, profile: &DiscordProfilePayload) {
    if let Some(value) = normalize(profile.display_name.as_deref()) {
        worker.display_name = Some(value);
    }

    if let Some(value) = normalize(profile.global_name.as_deref()) {
        worker.global_name = Some(value);
    }

    if let Some(value) = normalize(profile.nickname.as_deref()) {
        worker.nickname = Some(value);
    }

    if let Some(value) = normalize(profile.user_tag.as_deref()) {
        worker.user_tag = Some(value);
    }

    if let Some(value) = normalize(profile.username.as_deref()) {
        worker.username = Some(value);
    }

    if let Some(value) = normalize(profile.discriminator.as_deref()) {
        if value != "0" {
            worker.discriminator = Some(value);
        } else {
            worker.discriminator = None;
        }
    }
}

fn normalize(value: Option<&str>) -> Option<String> {
    let candidate = value?.trim();
    if candidate.is_empty() {
        None
    } else {
        Some(candidate.to_string())
    }
}

fn apply_profile_overrides(worker: &mut WorkerRecord, payload: &UpdateProfileRequest) {
    if let Some(value) = payload.first_name.as_ref() {
        worker.first_name = normalize(value.as_deref());
    }

    if let Some(value) = payload.last_name.as_ref() {
        worker.last_name = normalize(value.as_deref());
    }

    if let Some(value) = payload.pronouns.as_ref() {
        worker.pronouns = normalize(value.as_deref());
    }

    if let Some(value) = payload.location.as_ref() {
        worker.location = normalize(value.as_deref());
    }

    if let Some(value) = payload.timezone.as_ref() {
        worker.timezone = normalize(value.as_deref());
    }

    if let Some(value) = payload.bio.as_ref() {
        worker.bio = normalize(value.as_deref());
    }
}
