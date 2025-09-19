use std::sync::Arc;

use async_trait::async_trait;

use crate::{
    config::{DatabaseBackend, MongoConfig, SqliteConfig},
    error::ApiError,
    models::{
        clockins::ClockInMessageDocument, guild_worker::GuildWorkersDocument,
        roles::GuildRolesDocument, settings::GuildSettingsDocument,
    },
};

mod mongo;
mod sqlite;

pub use mongo::MongoRepository;
pub use sqlite::SqliteRepository;

#[async_trait]
pub trait Repository: Send + Sync {
    async fn get_or_init_workers(&self, guild_id: &str) -> Result<GuildWorkersDocument, ApiError>;

    async fn persist_workers(&self, workers: &GuildWorkersDocument) -> Result<(), ApiError>;

    async fn find_workers(&self, guild_id: &str) -> Result<Option<GuildWorkersDocument>, ApiError>;

    async fn upsert_clockin_message(&self, record: &ClockInMessageDocument)
    -> Result<(), ApiError>;

    async fn delete_clockin_message(&self, guild_id: &str, user_id: &str) -> Result<(), ApiError>;

    async fn get_roles(&self, guild_id: &str) -> Result<Option<GuildRolesDocument>, ApiError>;

    async fn get_or_init_roles(&self, guild_id: &str) -> Result<GuildRolesDocument, ApiError>;

    async fn persist_roles(&self, roles: &GuildRolesDocument) -> Result<(), ApiError>;

    async fn delete_roles(&self, guild_id: &str) -> Result<Option<GuildRolesDocument>, ApiError>;

    async fn get_or_init_settings(&self, guild_id: &str)
    -> Result<GuildSettingsDocument, ApiError>;

    async fn persist_settings(&self, settings: &GuildSettingsDocument) -> Result<(), ApiError>;

    async fn delete_settings(
        &self,
        guild_id: &str,
    ) -> Result<Option<GuildSettingsDocument>, ApiError>;

    async fn delete_workers(
        &self,
        guild_id: &str,
    ) -> Result<Option<GuildWorkersDocument>, ApiError>;
}

pub async fn build_repository(
    backend: DatabaseBackend,
    mongo: &MongoConfig,
    sqlite: &SqliteConfig,
) -> Result<Arc<dyn Repository>, ApiError> {
    match backend {
        DatabaseBackend::Mongo => {
            let repo = MongoRepository::new(mongo).await?;
            Ok(Arc::new(repo))
        }
        DatabaseBackend::Sqlite => {
            let repo = SqliteRepository::new(sqlite).await?;
            Ok(Arc::new(repo))
        }
    }
}
