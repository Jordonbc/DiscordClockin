use std::sync::Arc;

use log::{debug, info};

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
        let backend = config.database.backend.clone();
        debug!("Preparing application state with {backend:?} repository backend");

        let repository = repository::build_repository(
            backend.clone(),
            &config.database.mongodb,
            &config.database.sqlite,
        )
        .await?;

        info!("Repository initialized using {backend:?} backend");

        Ok(Self { config, repository })
    }
}
