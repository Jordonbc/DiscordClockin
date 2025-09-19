use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use actix_web::{HttpResponse, delete, get, post, web};
use log::{debug, info};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    error::ApiError,
    models::{
        roles::RoleEntry,
        views::{GuildRolesView, RoleEntryView},
    },
    repository::Repository,
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct RolesPath {
    pub guild_id: String,
}

#[derive(Debug, Deserialize)]
pub struct RolePath {
    pub guild_id: String,
    pub role_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ExperiencePath {
    pub guild_id: String,
    pub experience: String,
}

#[derive(Debug, Serialize)]
pub struct RolesResponse {
    pub roles: GuildRolesView,
}

#[derive(Debug, Serialize)]
pub struct RoleResponse {
    pub role: RoleEntryView,
    pub roles: GuildRolesView,
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct CreateRoleRequest {
    pub name: String,
    pub category: String,
    pub hourly_salary: HashMap<String, f64>,
    pub experiences: Vec<String>,
    pub role_id: Option<String>,
}

impl Default for CreateRoleRequest {
    fn default() -> Self {
        Self {
            name: String::new(),
            category: String::new(),
            hourly_salary: HashMap::new(),
            experiences: Vec::new(),
            role_id: None,
        }
    }
}

#[derive(Debug, Deserialize, Default)]
pub struct ExperienceRequest {
    pub name: String,
}

#[get("/guilds/{guild_id}/roles")]
pub async fn get_roles(
    state: web::Data<AppState>,
    path: web::Path<RolesPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!("Fetching roles for guild {}", path.guild_id);
    let doc = repository.get_or_init_roles(&path.guild_id).await?;
    let roles = GuildRolesView::from(&doc);
    debug!(
        "Roles response for guild {} includes {} role entries",
        path.guild_id,
        roles.roles.len()
    );
    Ok(HttpResponse::Ok().json(RolesResponse { roles }))
}

#[post("/guilds/{guild_id}/roles")]
pub async fn create_role(
    state: web::Data<AppState>,
    path: web::Path<RolesPath>,
    payload: web::Json<CreateRoleRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!("Creating role in guild {}", path.guild_id);
    let mut roles_doc = repository.get_or_init_roles(&path.guild_id).await?;
    let settings = repository.get_or_init_settings(&path.guild_id).await?;

    enforce_role_limit(settings.plan.as_deref(), roles_doc.roles.len())?;

    let mut request = payload.into_inner();
    debug!(
        "Received role creation payload: name='{}', category='{}', experiences={:?}",
        request.name, request.category, request.experiences
    );

    dedupe_in_place(&mut request.experiences);
    if request.name.trim().is_empty() {
        return Err(ApiError::Validation("Role name is required".into()));
    }

    if request.category.trim().is_empty() {
        return Err(ApiError::Validation("Role category is required".into()));
    }

    if request.experiences.is_empty() {
        return Err(ApiError::Validation(
            "Select at least one experience".into(),
        ));
    }

    if request.hourly_salary.is_empty() {
        return Err(ApiError::Validation(
            "Provide hourly salary for the selected experiences".into(),
        ));
    }

    ensure_role_id_unique(&roles_doc, request.role_id.as_deref())?;

    let role_id = request
        .role_id
        .unwrap_or_else(|| generate_role_id(&roles_doc));

    let mut hourly_salary = HashMap::new();
    for experience in &request.experiences {
        if !roles_doc
            .experiences
            .iter()
            .any(|existing| existing == experience)
        {
            return Err(ApiError::Validation(format!(
                "Experience `{experience}` is not configured for this guild"
            )));
        }

        let rate = request
            .hourly_salary
            .get(experience)
            .copied()
            .ok_or_else(|| {
                ApiError::Validation(format!(
                    "Hourly salary for experience `{experience}` is missing"
                ))
            })?;

        if rate <= 0.0 {
            return Err(ApiError::Validation(
                "Hourly salary must be greater than zero".into(),
            ));
        }

        hourly_salary.insert(experience.clone(), rate);
    }

    if roles_doc
        .roles
        .iter()
        .any(|role| role.name.eq_ignore_ascii_case(&request.name))
    {
        return Err(ApiError::Conflict("Role name already exists".into()));
    }

    let category = request.category.trim().to_string();
    if !roles_doc
        .categories
        .iter()
        .any(|existing| existing.eq_ignore_ascii_case(&category))
    {
        roles_doc.categories.push(category.clone());
    }

    let new_role = RoleEntry {
        name: request.name.trim().to_string(),
        hourly_salary,
        category,
        id: role_id.clone(),
        experiences: request.experiences,
    };

    roles_doc.roles.push(new_role.clone());

    repository.persist_roles(&roles_doc).await?;

    info!(
        "Role '{}' ({}) created for guild {}; total roles now {}",
        new_role.name,
        new_role.id,
        path.guild_id,
        roles_doc.roles.len()
    );

    let view = RoleEntryView::from(&new_role);
    let roles = GuildRolesView::from(&roles_doc);

    Ok(HttpResponse::Created().json(RoleResponse { role: view, roles }))
}

#[delete("/guilds/{guild_id}/roles/{role_id}")]
pub async fn delete_role(
    state: web::Data<AppState>,
    path: web::Path<RolePath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!(
        "Deleting role {} from guild {}",
        path.role_id, path.guild_id
    );
    let mut roles_doc = repository.get_or_init_roles(&path.guild_id).await?;

    let role_index = roles_doc
        .roles
        .iter()
        .position(|role| role.id.eq_ignore_ascii_case(&path.role_id))
        .ok_or_else(|| ApiError::NotFound("Role not found".into()))?;

    if let Some(workers) = repository.find_workers(&path.guild_id).await? {
        if workers
            .workers
            .iter()
            .any(|worker| worker.role_id.eq_ignore_ascii_case(&path.role_id))
        {
            return Err(ApiError::Conflict(
                "Cannot delete role while workers are assigned to it".into(),
            ));
        }
    }

    let removed = roles_doc.roles.remove(role_index);

    repository.persist_roles(&roles_doc).await?;

    debug!(
        "Removed role {}; remaining roles {} for guild {}",
        path.role_id,
        roles_doc.roles.len(),
        path.guild_id
    );

    let roles = GuildRolesView::from(&roles_doc);
    let view = RoleEntryView::from(&removed);

    Ok(HttpResponse::Ok().json(RoleResponse { role: view, roles }))
}

#[post("/guilds/{guild_id}/roles/experiences")]
pub async fn add_experience(
    state: web::Data<AppState>,
    path: web::Path<RolesPath>,
    payload: web::Json<ExperienceRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!(
        "Adding experience '{}' to guild {}",
        path.experience, path.guild_id
    );
    let mut roles_doc = repository.get_or_init_roles(&path.guild_id).await?;
    let settings = repository.get_or_init_settings(&path.guild_id).await?;

    let experience = payload.name.trim();
    if experience.is_empty() {
        return Err(ApiError::Validation("Experience name is required".into()));
    }

    enforce_experience_limit(settings.plan.as_deref(), roles_doc.experiences.len())?;

    if roles_doc
        .experiences
        .iter()
        .any(|existing| existing.eq_ignore_ascii_case(experience))
    {
        return Err(ApiError::Conflict("Experience already exists".into()));
    }

    roles_doc.experiences.push(experience.to_string());
    repository.persist_roles(&roles_doc).await?;

    debug!(
        "Experience '{}' added to guild {}; total experiences now {}",
        request.name,
        path.guild_id,
        roles_doc.experiences.len()
    );

    let roles = GuildRolesView::from(&roles_doc);
    Ok(HttpResponse::Ok().json(RolesResponse { roles }))
}

#[delete("/guilds/{guild_id}/roles/experiences/{experience}")]
pub async fn remove_experience(
    state: web::Data<AppState>,
    path: web::Path<ExperiencePath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    info!(
        "Removing experience '{}' from guild {}",
        path.experience, path.guild_id
    );
    let mut roles_doc = repository.get_or_init_roles(&path.guild_id).await?;

    if roles_doc.experiences.len() <= 1 {
        return Err(ApiError::Conflict(
            "You must keep at least one experience configured".into(),
        ));
    }

    let target_index = roles_doc
        .experiences
        .iter()
        .position(|name| name.eq_ignore_ascii_case(&path.experience))
        .ok_or_else(|| ApiError::NotFound("Experience not found".into()))?;

    let lower_experience = roles_doc.experiences[target_index].clone();

    let conflicting_roles: Vec<String> = roles_doc
        .roles
        .iter()
        .filter(|role| {
            role.experiences
                .iter()
                .any(|exp| exp.eq_ignore_ascii_case(&lower_experience))
        })
        .map(|role| role.name.clone())
        .collect();

    if !conflicting_roles.is_empty() {
        return Err(ApiError::Conflict(format!(
            "Experience is still assigned to roles: {}",
            conflicting_roles.join(", ")
        )));
    }

    roles_doc.experiences.remove(target_index);

    for role in roles_doc.roles.iter_mut() {
        role.experiences
            .retain(|exp| !exp.eq_ignore_ascii_case(&lower_experience));

        let keys_to_remove: Vec<String> = role
            .hourly_salary
            .keys()
            .filter(|key| key.eq_ignore_ascii_case(&lower_experience))
            .cloned()
            .collect();
        for key in keys_to_remove {
            role.hourly_salary.remove(&key);
        }
    }

    repository.persist_roles(&roles_doc).await?;

    debug!(
        "Experience '{}' removed from guild {}; {} experiences remain",
        path.experience,
        path.guild_id,
        roles_doc.experiences.len()
    );

    let roles = GuildRolesView::from(&roles_doc);
    Ok(HttpResponse::Ok().json(RolesResponse { roles }))
}

fn enforce_role_limit(plan: Option<&str>, existing_roles: usize) -> Result<(), ApiError> {
    if matches!(plan, Some(p) if p.eq_ignore_ascii_case("basic")) && existing_roles >= 10 {
        return Err(ApiError::Conflict(
            "Basic plan is limited to 10 roles. Upgrade your plan to add more.".into(),
        ));
    }
    Ok(())
}

fn enforce_experience_limit(
    plan: Option<&str>,
    existing_experiences: usize,
) -> Result<(), ApiError> {
    if matches!(plan, Some(p) if p.eq_ignore_ascii_case("pro")) && existing_experiences >= 10 {
        return Err(ApiError::Conflict(
            "Pro plan is limited to 10 experiences. Upgrade your plan to add more.".into(),
        ));
    }

    if existing_experiences >= 25 {
        return Err(ApiError::Conflict(
            "Guilds can configure up to 25 experiences.".into(),
        ));
    }

    Ok(())
}

fn ensure_role_id_unique(
    roles_doc: &crate::models::roles::GuildRolesDocument,
    candidate: Option<&str>,
) -> Result<(), ApiError> {
    if let Some(id) = candidate {
        if roles_doc
            .roles
            .iter()
            .any(|role| role.id.eq_ignore_ascii_case(id))
        {
            return Err(ApiError::Conflict(
                "Provided role ID is already in use".into(),
            ));
        }
    }

    Ok(())
}

fn generate_role_id(roles_doc: &crate::models::roles::GuildRolesDocument) -> String {
    loop {
        let candidate = Uuid::new_v4()
            .simple()
            .to_string()
            .chars()
            .take(6)
            .collect::<String>()
            .to_uppercase();

        if !roles_doc
            .roles
            .iter()
            .any(|role| role.id.eq_ignore_ascii_case(&candidate))
        {
            return candidate;
        }
    }
}

fn dedupe_in_place(values: &mut Vec<String>) {
    let mut seen = HashSet::new();
    values.retain(|value| {
        let key = value.to_ascii_lowercase();
        if seen.contains(&key) {
            false
        } else {
            seen.insert(key);
            true
        }
    });
}
