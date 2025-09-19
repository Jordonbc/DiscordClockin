use async_trait::async_trait;
use serde::de::DeserializeOwned;
use tokio_rusqlite::Connection;

use crate::{
    config::SqliteConfig,
    error::ApiError,
    models::{
        clockins::ClockInMessageDocument, guild_worker::GuildWorkersDocument,
        roles::GuildRolesDocument,
    },
};

use super::Repository;

const CREATE_GUILD_WORKERS: &str =
    "CREATE TABLE IF NOT EXISTS guild_workers (guild_id TEXT PRIMARY KEY, data TEXT NOT NULL)";
const CREATE_CLOCKINS: &str = "CREATE TABLE IF NOT EXISTS clockins (guild_id TEXT NOT NULL, user_id TEXT NOT NULL, message_id TEXT NOT NULL, PRIMARY KEY (guild_id, user_id))";
const CREATE_ROLES: &str =
    "CREATE TABLE IF NOT EXISTS roles (guild_id TEXT PRIMARY KEY, data TEXT NOT NULL)";

pub struct SqliteRepository {
    connection: Connection,
}

impl SqliteRepository {
    pub async fn new(config: &SqliteConfig) -> Result<Self, ApiError> {
        let connection = Connection::open(&config.path).await?;
        connection
            .call(
                |conn: &mut rusqlite::Connection| -> Result<(), tokio_rusqlite::Error> {
                    conn.execute(CREATE_GUILD_WORKERS, [])
                        .map_err(tokio_rusqlite::Error::from)?;
                    conn.execute(CREATE_CLOCKINS, [])
                        .map_err(tokio_rusqlite::Error::from)?;
                    conn.execute(CREATE_ROLES, [])
                        .map_err(tokio_rusqlite::Error::from)?;
                    Ok(())
                },
            )
            .await?;

        Ok(Self { connection })
    }

    async fn read_json<T>(&self, query: &'static str, guild_id: &str) -> Result<Option<T>, ApiError>
    where
        T: DeserializeOwned,
    {
        let id = guild_id.to_string();
        let json = self
            .connection
            .call(move |conn: &mut rusqlite::Connection| -> Result<Option<String>, tokio_rusqlite::Error> {
                let mut stmt = conn
                    .prepare(query)
                    .map_err(tokio_rusqlite::Error::from)?;
                match stmt.query_row([&id], |row| row.get::<_, String>(0)) {
                    Ok(data) => Ok(Some(data)),
                    Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                    Err(err) => Err(tokio_rusqlite::Error::from(err)),
                }
            })
            .await?;

        match json {
            Some(data) => {
                let parsed = serde_json::from_str(&data)
                    .map_err(|err| ApiError::Storage(format!("failed to parse row: {err}")))?;
                Ok(Some(parsed))
            }
            None => Ok(None),
        }
    }

    async fn upsert_json<T>(
        &self,
        query: &'static str,
        guild_id: &str,
        value: &T,
    ) -> Result<(), ApiError>
    where
        T: serde::Serialize,
    {
        let id = guild_id.to_string();
        let json = serde_json::to_string(value)
            .map_err(|err| ApiError::Storage(format!("failed to serialize value: {err}")))?;
        self.connection
            .call(
                move |conn: &mut rusqlite::Connection| -> Result<(), tokio_rusqlite::Error> {
                    conn.execute(query, [&id, &json])
                        .map_err(tokio_rusqlite::Error::from)?;
                    Ok(())
                },
            )
            .await?;
        Ok(())
    }
}

#[async_trait]
impl Repository for SqliteRepository {
    async fn get_or_init_workers(&self, guild_id: &str) -> Result<GuildWorkersDocument, ApiError> {
        if let Some(document) = self
            .read_json::<GuildWorkersDocument>(
                "SELECT data FROM guild_workers WHERE guild_id = ?1",
                guild_id,
            )
            .await?
        {
            return Ok(document);
        }

        let document = GuildWorkersDocument {
            id: None,
            guild_id: guild_id.to_string(),
            workers: Vec::new(),
        };

        self.upsert_json(
            "INSERT OR REPLACE INTO guild_workers (guild_id, data) VALUES (?1, ?2)",
            guild_id,
            &document,
        )
        .await?;

        Ok(document)
    }

    async fn persist_workers(&self, workers: &GuildWorkersDocument) -> Result<(), ApiError> {
        self.upsert_json(
            "INSERT OR REPLACE INTO guild_workers (guild_id, data) VALUES (?1, ?2)",
            &workers.guild_id,
            workers,
        )
        .await
    }

    async fn find_workers(&self, guild_id: &str) -> Result<Option<GuildWorkersDocument>, ApiError> {
        self.read_json(
            "SELECT data FROM guild_workers WHERE guild_id = ?1",
            guild_id,
        )
        .await
    }

    async fn upsert_clockin_message(
        &self,
        record: &ClockInMessageDocument,
    ) -> Result<(), ApiError> {
        let payload = record.clone();
        self.connection
            .call(move |conn: &mut rusqlite::Connection| -> Result<(), tokio_rusqlite::Error> {
                conn.execute(
                    "INSERT OR REPLACE INTO clockins (guild_id, user_id, message_id) VALUES (?1, ?2, ?3)",
                    [&payload.guild_id, &payload.user_id, &payload.message_id],
                )
                .map_err(tokio_rusqlite::Error::from)?;
                Ok(())
            })
            .await?;
        Ok(())
    }

    async fn delete_clockin_message(&self, guild_id: &str, user_id: &str) -> Result<(), ApiError> {
        let g = guild_id.to_string();
        let u = user_id.to_string();
        self.connection
            .call(
                move |conn: &mut rusqlite::Connection| -> Result<(), tokio_rusqlite::Error> {
                    conn.execute(
                        "DELETE FROM clockins WHERE guild_id = ?1 AND user_id = ?2",
                        [&g, &u],
                    )
                    .map_err(tokio_rusqlite::Error::from)?;
                    Ok(())
                },
            )
            .await?;
        Ok(())
    }

    async fn get_roles(&self, guild_id: &str) -> Result<Option<GuildRolesDocument>, ApiError> {
        self.read_json("SELECT data FROM roles WHERE guild_id = ?1", guild_id)
            .await
    }
}
