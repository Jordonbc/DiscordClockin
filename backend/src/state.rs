use std::sync::Arc;

use crate::{
    config::AppConfig,
    error::ApiError,
    repository::{self, Repository},
};

#[derive(Clone)]
pub struct AppState {
    #[allow(dead_code)]
    pub config: AppConfig,
    pub repository: Arc<dyn Repository>,
}

impl AppState {
    pub async fn initialize(config: AppConfig) -> Result<Self, ApiError> {
        let repository = repository::build_repository(
            config.database.backend.clone(),
            &config.database.mongodb,
            &config.database.sqlite,
        )
        .await?;

        Ok(Self { config, repository })
    }
}
