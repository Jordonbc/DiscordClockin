use crate::{config::AppConfig, error::ApiError};
use mongodb::{Client, Database};

#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub client: Client,
    pub database: Database,
}

impl AppState {
    pub async fn initialize(config: AppConfig) -> Result<Self, ApiError> {
        let client = Client::with_uri_str(&config.mongodb.uri).await?;
        let database = client.database(&config.mongodb.database);
        Ok(Self {
            config,
            client,
            database,
        })
    }

    pub fn workers_collection(&self) -> mongodb::Collection<crate::models::guild_worker::GuildWorkersDocument> {
        self.database
            .collection::<crate::models::guild_worker::GuildWorkersDocument>("guildworkers")
    }

    pub fn settings_collection(
        &self,
    ) -> mongodb::Collection<crate::models::settings::GuildSettingsDocument> {
        self.database
            .collection::<crate::models::settings::GuildSettingsDocument>("guildsettings")
    }

    pub fn roles_collection(&self) -> mongodb::Collection<crate::models::roles::GuildRolesDocument> {
        self.database
            .collection::<crate::models::roles::GuildRolesDocument>("roles")
    }

    pub fn clockins_collection(
        &self,
    ) -> mongodb::Collection<crate::models::clockins::ClockInMessageDocument> {
        self.database
            .collection::<crate::models::clockins::ClockInMessageDocument>("clockins")
    }
}
