use std::sync::Arc;

use actix_web::{HttpResponse, delete, patch, post, web};
use log::info;
use serde::Deserialize;

use crate::{
    error::ApiError, models::roles::GuildRolesDocument, repository::Repository, state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct DepartmentsPath {
    pub guild_id: String,
}

#[derive(Debug, Deserialize)]
pub struct DepartmentPath {
    pub guild_id: String,
    pub department_id: String,
}

#[derive(Debug, Deserialize)]
pub struct DepartmentRequest {
    pub name: String,
}

#[post("/guilds/{guild_id}/departments")]
pub async fn create_department(
    state: web::Data<AppState>,
    path: web::Path<DepartmentsPath>,
    payload: web::Json<DepartmentRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let mut roles_doc = repository.get_or_init_roles(&path.guild_id).await?;

    let trimmed_name = payload.name.trim();
    if trimmed_name.is_empty() {
        return Err(ApiError::Validation("Department name is required".into()));
    }

    let key = department_key(trimmed_name);
    if key.is_empty() {
        return Err(ApiError::Validation(
            "Department name must include alphanumeric characters".into(),
        ));
    }

    if department_exists(&roles_doc, &key) {
        return Err(ApiError::Conflict("Department already exists".into()));
    }

    info!(
        "Creating department '{}' ({}) for guild {}",
        trimmed_name, key, path.guild_id
    );
    roles_doc.categories.push(trimmed_name.to_string());
    repository.persist_roles(&roles_doc).await?;

    Ok(HttpResponse::NoContent().finish())
}

#[patch("/guilds/{guild_id}/departments/{department_id}")]
pub async fn rename_department(
    state: web::Data<AppState>,
    path: web::Path<DepartmentPath>,
    payload: web::Json<DepartmentRequest>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let mut roles_doc = repository.get_or_init_roles(&path.guild_id).await?;

    let Some(index) = find_department_index(&roles_doc, &path.department_id) else {
        return Err(ApiError::NotFound("Department not found".into()));
    };

    let trimmed_name = payload.name.trim();
    if trimmed_name.is_empty() {
        return Err(ApiError::Validation("Department name is required".into()));
    }

    let key = department_key(trimmed_name);
    if key.is_empty() {
        return Err(ApiError::Validation(
            "Department name must include alphanumeric characters".into(),
        ));
    }

    if department_exists_excluding(&roles_doc, &key, index) {
        return Err(ApiError::Conflict("Department already exists".into()));
    }

    let old_name = roles_doc.categories[index].clone();
    if old_name == trimmed_name {
        return Ok(HttpResponse::NoContent().finish());
    }

    info!(
        "Renaming department '{}' ({}) to '{}' in guild {}",
        old_name, path.department_id, trimmed_name, path.guild_id
    );

    roles_doc.categories[index] = trimmed_name.to_string();

    for role in &mut roles_doc.roles {
        if department_key(&role.category) == path.department_id {
            role.category = trimmed_name.to_string();
        }
    }

    repository.persist_roles(&roles_doc).await?;

    Ok(HttpResponse::NoContent().finish())
}

#[delete("/guilds/{guild_id}/departments/{department_id}")]
pub async fn delete_department(
    state: web::Data<AppState>,
    path: web::Path<DepartmentPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let mut roles_doc = repository.get_or_init_roles(&path.guild_id).await?;

    let Some(index) = find_department_index(&roles_doc, &path.department_id) else {
        return Err(ApiError::NotFound("Department not found".into()));
    };

    let removed = roles_doc.categories.remove(index);
    info!(
        "Deleting department '{}' ({}) for guild {}",
        removed, path.department_id, path.guild_id
    );

    for role in &mut roles_doc.roles {
        if department_key(&role.category) == path.department_id {
            role.category.clear();
        }
    }

    repository.persist_roles(&roles_doc).await?;

    Ok(HttpResponse::NoContent().finish())
}

fn department_exists(doc: &GuildRolesDocument, key: &str) -> bool {
    doc.categories
        .iter()
        .any(|category| department_key(category) == key)
}

fn department_exists_excluding(doc: &GuildRolesDocument, key: &str, index: usize) -> bool {
    doc.categories
        .iter()
        .enumerate()
        .any(|(idx, category)| idx != index && department_key(category) == key)
}

fn find_department_index(doc: &GuildRolesDocument, department_id: &str) -> Option<usize> {
    doc.categories
        .iter()
        .position(|category| department_key(category) == department_id)
}

fn department_key(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}
