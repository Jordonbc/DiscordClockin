use async_trait::async_trait;
use log::{debug, info, trace};
use mongodb::{
    Client, Collection, Database,
    bson::{Bson, doc},
};

use crate::{
    config::MongoConfig,
    error::ApiError,
    models::{
        clockins::ClockInMessageDocument, guild_worker::GuildWorkersDocument,
        roles::GuildRolesDocument, settings::GuildSettingsDocument,
    },
};

use super::Repository;

pub struct MongoRepository {
    #[allow(dead_code)]
    client: Client,
    database: Database,
}

impl MongoRepository {
    pub async fn new(config: &MongoConfig) -> Result<Self, ApiError> {
        debug!(
            "Connecting to MongoDB database '{}' using configured URI",
            config.database
        );
        let client = Client::with_uri_str(&config.uri).await?;
        let database = client.database(&config.database);
        info!(
            "MongoDB connection established for database '{}'",
            config.database
        );
        Ok(Self { client, database })
    }

    fn workers_collection(&self) -> Collection<GuildWorkersDocument> {
        trace!("Resolving MongoDB workers collection handle");
        self.database
            .collection::<GuildWorkersDocument>("guildworkers")
    }

    fn roles_collection(&self) -> Collection<GuildRolesDocument> {
        trace!("Resolving MongoDB roles collection handle");
        self.database.collection::<GuildRolesDocument>("roles")
    }

    fn clockins_collection(&self) -> Collection<ClockInMessageDocument> {
        trace!("Resolving MongoDB clockins collection handle");
        self.database
            .collection::<ClockInMessageDocument>("clockins")
    }

    fn settings_collection(&self) -> Collection<GuildSettingsDocument> {
        trace!("Resolving MongoDB settings collection handle");
        self.database
            .collection::<GuildSettingsDocument>("settings")
    }
}

#[async_trait]
impl Repository for MongoRepository {
    async fn get_or_init_workers(&self, guild_id: &str) -> Result<GuildWorkersDocument, ApiError> {
        debug!("Fetching worker roster for guild {guild_id}");
        if let Some(document) = self
            .workers_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?
        {
            return Ok(document);
        }

        debug!("No workers roster found; creating default entry for guild {guild_id}");
        let mut document = GuildWorkersDocument {
            id: None,
            guild_id: guild_id.to_string(),
            workers: Vec::new(),
        };

        let insert = self.workers_collection().insert_one(&document).await?;
        if let Bson::ObjectId(id) = insert.inserted_id {
            document.id = Some(id);
        }

        debug!("Initialized empty workers roster for guild {guild_id}");
        Ok(document)
    }

    async fn persist_workers(&self, workers: &GuildWorkersDocument) -> Result<(), ApiError> {
        debug!(
            "Persisting {} worker records for guild {}",
            workers.workers.len(),
            workers.guild_id
        );
        self.workers_collection()
            .replace_one(doc! { "guildId": &workers.guild_id }, workers)
            .await?;
        Ok(())
    }

    async fn find_workers(&self, guild_id: &str) -> Result<Option<GuildWorkersDocument>, ApiError> {
        debug!("Looking up workers document for guild {guild_id}");
        let document = self
            .workers_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?;
        Ok(document)
    }

    async fn upsert_clockin_message(
        &self,
        record: &ClockInMessageDocument,
    ) -> Result<(), ApiError> {
        debug!(
            "Upserting clock-in message for guild {} user {}",
            record.guild_id, record.user_id
        );
        let filter = doc! {
            "guildId": &record.guild_id,
            "userId": &record.user_id,
        };
        let update = doc! {
            "$set": {
                "guildId": &record.guild_id,
                "userId": &record.user_id,
                "messageId": &record.message_id,
            }
        };
        self.clockins_collection()
            .update_one(filter, update)
            .upsert(true)
            .await?;
        Ok(())
    }

    async fn delete_clockin_message(&self, guild_id: &str, user_id: &str) -> Result<(), ApiError> {
        debug!("Deleting clock-in message for guild {guild_id} user {user_id}");
        self.clockins_collection()
            .delete_one(doc! { "guildId": guild_id, "userId": user_id })
            .await?;
        Ok(())
    }

    async fn get_roles(&self, guild_id: &str) -> Result<Option<GuildRolesDocument>, ApiError> {
        debug!("Retrieving roles document for guild {guild_id}");
        let document = self
            .roles_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?;
        Ok(document)
    }

    async fn get_or_init_roles(&self, guild_id: &str) -> Result<GuildRolesDocument, ApiError> {
        debug!("Fetching roles configuration for guild {guild_id}");
        if let Some(document) = self
            .roles_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?
        {
            return Ok(document);
        }

        debug!("No roles configuration found; seeding defaults for guild {guild_id}");
        let mut document = GuildRolesDocument {
            id: None,
            guild_id: guild_id.to_string(),
            roles: Vec::new(),
            categories: Vec::new(),
            experiences: Vec::new(),
        };

        let insert = self.roles_collection().insert_one(&document).await?;
        if let Bson::ObjectId(id) = insert.inserted_id {
            document.id = Some(id);
        }

        debug!("Initialized empty roles configuration for guild {guild_id}");
        Ok(document)
    }

    async fn persist_roles(&self, roles: &GuildRolesDocument) -> Result<(), ApiError> {
        debug!(
            "Persisting roles configuration with {} roles for guild {}",
            roles.roles.len(),
            roles.guild_id
        );
        let filter = doc! { "guildId": &roles.guild_id };
        self.roles_collection().replace_one(filter, roles).await?;
        Ok(())
    }

    async fn delete_roles(&self, guild_id: &str) -> Result<Option<GuildRolesDocument>, ApiError> {
        debug!("Deleting roles configuration for guild {guild_id}");
        let existing = self
            .roles_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?;

        if existing.is_some() {
            self.roles_collection()
                .delete_one(doc! { "guildId": guild_id })
                .await?;
            debug!("Removed roles configuration for guild {guild_id}");
        }

        Ok(existing)
    }

    async fn get_or_init_settings(
        &self,
        guild_id: &str,
    ) -> Result<GuildSettingsDocument, ApiError> {
        debug!("Fetching settings for guild {guild_id}");
        if let Some(document) = self
            .settings_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?
        {
            return Ok(document);
        }

        debug!("No settings found; creating defaults for guild {guild_id}");
        let mut document = GuildSettingsDocument {
            id: None,
            guild_id: guild_id.to_string(),
            ..GuildSettingsDocument::default()
        };

        let insert = self.settings_collection().insert_one(&document).await?;
        if let Bson::ObjectId(id) = insert.inserted_id {
            document.id = Some(id);
        }

        debug!("Initialized default settings for guild {guild_id}");
        Ok(document)
    }

    async fn persist_settings(&self, settings: &GuildSettingsDocument) -> Result<(), ApiError> {
        debug!(
            "Persisting settings document for guild {}",
            settings.guild_id
        );
        let filter = doc! { "guildId": &settings.guild_id };
        self.settings_collection()
            .replace_one(filter, settings)
            .await?;
        Ok(())
    }

    async fn delete_settings(
        &self,
        guild_id: &str,
    ) -> Result<Option<GuildSettingsDocument>, ApiError> {
        debug!("Deleting settings for guild {guild_id}");
        let existing = self
            .settings_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?;

        if existing.is_some() {
            self.settings_collection()
                .delete_one(doc! { "guildId": guild_id })
                .await?;
            debug!("Removed settings for guild {guild_id}");
        }

        Ok(existing)
    }

    async fn delete_workers(
        &self,
        guild_id: &str,
    ) -> Result<Option<GuildWorkersDocument>, ApiError> {
        debug!("Deleting workers roster for guild {guild_id}");
        let existing = self
            .workers_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?;

        if existing.is_some() {
            self.workers_collection()
                .delete_one(doc! { "guildId": guild_id })
                .await?;
            debug!("Removed worker roster for guild {guild_id}");
        }

        Ok(existing)
    }
}
