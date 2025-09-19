use async_trait::async_trait;
use mongodb::{
    Client, Collection, Database,
    bson::{Bson, doc},
};

use crate::{
    config::MongoConfig,
    error::ApiError,
    models::{
        clockins::ClockInMessageDocument, guild_worker::GuildWorkersDocument,
        roles::GuildRolesDocument,
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
        let client = Client::with_uri_str(&config.uri).await?;
        let database = client.database(&config.database);
        Ok(Self { client, database })
    }

    fn workers_collection(&self) -> Collection<GuildWorkersDocument> {
        self.database
            .collection::<GuildWorkersDocument>("guildworkers")
    }

    fn roles_collection(&self) -> Collection<GuildRolesDocument> {
        self.database.collection::<GuildRolesDocument>("roles")
    }

    fn clockins_collection(&self) -> Collection<ClockInMessageDocument> {
        self.database
            .collection::<ClockInMessageDocument>("clockins")
    }
}

#[async_trait]
impl Repository for MongoRepository {
    async fn get_or_init_workers(&self, guild_id: &str) -> Result<GuildWorkersDocument, ApiError> {
        if let Some(document) = self
            .workers_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?
        {
            return Ok(document);
        }

        let mut document = GuildWorkersDocument {
            id: None,
            guild_id: guild_id.to_string(),
            workers: Vec::new(),
        };

        let insert = self.workers_collection().insert_one(&document).await?;
        if let Bson::ObjectId(id) = insert.inserted_id {
            document.id = Some(id);
        }

        Ok(document)
    }

    async fn persist_workers(&self, workers: &GuildWorkersDocument) -> Result<(), ApiError> {
        self.workers_collection()
            .replace_one(doc! { "guildId": &workers.guild_id }, workers)
            .await?;
        Ok(())
    }

    async fn find_workers(&self, guild_id: &str) -> Result<Option<GuildWorkersDocument>, ApiError> {
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
        self.clockins_collection()
            .delete_one(doc! { "guildId": guild_id, "userId": user_id })
            .await?;
        Ok(())
    }

    async fn get_roles(&self, guild_id: &str) -> Result<Option<GuildRolesDocument>, ApiError> {
        let document = self
            .roles_collection()
            .find_one(doc! { "guildId": guild_id })
            .await?;
        Ok(document)
    }
}
