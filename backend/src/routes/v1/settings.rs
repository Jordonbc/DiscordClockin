use std::collections::HashSet;
use std::sync::Arc;

use actix_web::{HttpResponse, get, patch, web};
use log::{debug, info};
use serde::{Deserialize, Serialize};

use crate::{
    error::ApiError, models::views::GuildSettingsView, repository::Repository, state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct SettingsPath {
    pub guild_id: String,
}

#[derive(Debug, Serialize)]
pub struct SettingsResponse {
    pub settings: GuildSettingsView,
}

#[derive(Debug, Deserialize, Default)]
pub struct UpdateSettingsRequest {
    pub plan: Option<String>,
    pub log_channel_id: Option<String>,
    pub weekly_report_channel_id: Option<String>,
    pub time_zone: Option<String>,
    pub target_hours: Option<i64>,
    pub max_afk_hours: Option<i64>,
    pub afk_reminders: Option<i64>,
    pub worker_voice_chats: Option<Vec<String>>,
    pub voice_exempt_role: Option<Vec<String>>,
    pub bot_admin_role: Option<Vec<String>>,
    pub weekly_exempt_role: Option<String>,
}

#[get("/guilds/{guild_id}/settings")]
pub async fn get_settings(
    state: web::Data<AppState>,
    path: web::Path<SettingsPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!("Fetching settings for guild {}", path.guild_id);
    let settings = repository.get_or_init_settings(&path.guild_id).await?;
    let view = GuildSettingsView::from(&settings);
    debug!("Settings payload for guild {} returned", path.guild_id);
    Ok(HttpResponse::Ok().json(SettingsResponse { settings: view }))
}

#[patch("/guilds/{guild_id}/settings")]
pub async fn update_settings(
    state: web::Data<AppState>,
    path: web::Path<SettingsPath>,
    payload: web::Json<UpdateSettingsRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!("Updating settings for guild {}", path.guild_id);
    let mut settings = repository.get_or_init_settings(&path.guild_id).await?;

    let body = payload.into_inner();
    let mut changed_fields = Vec::new();

    if let Some(plan) = body.plan {
        settings.plan = Some(plan);
        changed_fields.push("plan");
    }

    if let Some(channel) = body.log_channel_id {
        settings.log_channel_id = Some(channel);
        changed_fields.push("log_channel_id");
    }

    if let Some(channel) = body.weekly_report_channel_id {
        settings.weekly_report_channel_id = Some(channel);
        changed_fields.push("weekly_report_channel_id");
    }

    if let Some(zone) = body.time_zone {
        settings.time_zone = Some(zone);
        changed_fields.push("time_zone");
    }

    if let Some(target_hours) = body.target_hours {
        settings.target_hours = Some(target_hours);
        changed_fields.push("target_hours");
    }

    if let Some(max_afk) = body.max_afk_hours {
        settings.max_afk_hours = Some(max_afk);
        changed_fields.push("max_afk_hours");
    }

    if let Some(reminders) = body.afk_reminders {
        settings.afk_reminders = Some(reminders);
        changed_fields.push("afk_reminders");
    }

    if let Some(voice_chats) = body.worker_voice_chats {
        settings.worker_voice_chats = dedupe(voice_chats);
        changed_fields.push("worker_voice_chats");
    }

    if let Some(roles) = body.voice_exempt_role {
        settings.voice_exempt_role = dedupe(roles);
        changed_fields.push("voice_exempt_role");
    }

    if let Some(roles) = body.bot_admin_role {
        settings.bot_admin_role = dedupe(roles);
        changed_fields.push("bot_admin_role");
    }

    if let Some(role) = body.weekly_exempt_role {
        settings.weekly_exempt_role = Some(role);
        changed_fields.push("weekly_exempt_role");
    }

    repository.persist_settings(&settings).await?;

    let view = GuildSettingsView::from(&settings);
    debug!(
        "Settings update for guild {} touched fields: {:?}",
        path.guild_id, changed_fields
    );
    info!(
        "Settings for guild {} updated ({} fields)",
        path.guild_id,
        changed_fields.len()
    );
    Ok(HttpResponse::Ok().json(SettingsResponse { settings: view }))
}

fn dedupe(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for value in values {
        if seen.insert(value.clone()) {
            result.push(value);
        }
    }
    result
}
