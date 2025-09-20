use std::path::Path;

use async_trait::async_trait;
use log::{debug, info, trace};
use serde::de::DeserializeOwned;
use tokio_rusqlite::Connection;

use crate::{
    config::SqliteConfig,
    error::ApiError,
    logging::redact_user_id,
    models::{
        clockins::ClockInMessageDocument, guild_worker::GuildWorkersDocument,
        roles::GuildRolesDocument, settings::GuildSettingsDocument,
    },
};

use super::Repository;

const CREATE_GUILD_WORKERS: &str =
    "CREATE TABLE IF NOT EXISTS guild_workers (guild_id TEXT PRIMARY KEY, data TEXT NOT NULL)";
const CREATE_CLOCKINS: &str = "CREATE TABLE IF NOT EXISTS clockins (guild_id TEXT NOT NULL, user_id TEXT NOT NULL, message_id TEXT NOT NULL, PRIMARY KEY (guild_id, user_id))";
const CREATE_ROLES: &str =
    "CREATE TABLE IF NOT EXISTS roles (guild_id TEXT PRIMARY KEY, data TEXT NOT NULL)";
const CREATE_SETTINGS: &str =
    "CREATE TABLE IF NOT EXISTS settings (guild_id TEXT PRIMARY KEY, data TEXT NOT NULL)";

pub struct SqliteRepository {
    connection: Connection,
}

impl SqliteRepository {
    pub async fn new(config: &SqliteConfig) -> Result<Self, ApiError> {
        debug!("Opening SQLite database at {}", config.path);
        let db_path = Path::new(&config.path);

        if let Some(parent) = db_path.parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent).map_err(|err| {
                    ApiError::Storage(format!(
                        "failed to create SQLite data directory {}: {err}",
                        parent.display()
                    ))
                })?;
            }
        }

        let connection = Connection::open(db_path).await?;
        info!("SQLite connection established at {}", config.path);
        connection
            .call(
                |conn: &mut rusqlite::Connection| -> Result<(), tokio_rusqlite::Error> {
                    trace!("Ensuring SQLite schema is up to date");
                    conn.execute(CREATE_GUILD_WORKERS, [])
                        .map_err(tokio_rusqlite::Error::from)?;
                    conn.execute(CREATE_CLOCKINS, [])
                        .map_err(tokio_rusqlite::Error::from)?;
                    conn.execute(CREATE_ROLES, [])
                        .map_err(tokio_rusqlite::Error::from)?;
                    conn.execute(CREATE_SETTINGS, [])
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
                trace!("Executing SQLite query for guild_id={}", id);
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
                    trace!("Executing SQLite upsert for guild_id={}", id);
                    conn.execute(query, [&id, &json])
                        .map_err(tokio_rusqlite::Error::from)?;
                    Ok(())
                },
            )
            .await?;
        Ok(())
    }

    async fn delete_row(&self, query: &'static str, guild_id: &str) -> Result<usize, ApiError> {
        let id = guild_id.to_string();
        let affected = self
            .connection
            .call(
                move |conn: &mut rusqlite::Connection| -> Result<usize, tokio_rusqlite::Error> {
                    trace!("Executing SQLite delete for guild_id={}", id);
                    conn.execute(query, [&id])
                        .map_err(tokio_rusqlite::Error::from)
                },
            )
            .await?;
        Ok(affected)
    }
}

#[async_trait]
impl Repository for SqliteRepository {
    async fn get_or_init_workers(&self, guild_id: &str) -> Result<GuildWorkersDocument, ApiError> {
        debug!("Fetching worker roster for guild {guild_id} from SQLite");
        if let Some(document) = self
            .read_json::<GuildWorkersDocument>(
                "SELECT data FROM guild_workers WHERE guild_id = ?1",
                guild_id,
            )
            .await?
        {
            return Ok(document);
        }

        debug!("No SQLite worker roster found; creating default for guild {guild_id}");
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
        debug!(
            "Persisting {} worker records for guild {} in SQLite",
            workers.workers.len(),
            workers.guild_id
        );
        self.upsert_json(
            "INSERT OR REPLACE INTO guild_workers (guild_id, data) VALUES (?1, ?2)",
            &workers.guild_id,
            workers,
        )
        .await
    }

    async fn find_workers(&self, guild_id: &str) -> Result<Option<GuildWorkersDocument>, ApiError> {
        debug!("Looking up workers document for guild {guild_id} in SQLite");
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
        debug!(
            "Upserting clock-in message in SQLite for guild {} user {}",
            record.guild_id,
            redact_user_id(&record.user_id)
        );
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
        debug!(
            "Deleting clock-in message from SQLite for guild {guild_id} user {}",
            redact_user_id(user_id)
        );
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
        debug!("Retrieving roles document for guild {guild_id} from SQLite");
        self.read_json("SELECT data FROM roles WHERE guild_id = ?1", guild_id)
            .await
    }

    async fn get_or_init_roles(&self, guild_id: &str) -> Result<GuildRolesDocument, ApiError> {
        debug!("Fetching roles configuration for guild {guild_id} from SQLite");
        if let Some(document) = self
            .read_json::<GuildRolesDocument>("SELECT data FROM roles WHERE guild_id = ?1", guild_id)
            .await?
        {
            return Ok(document);
        }

        debug!("No SQLite roles configuration found; creating default for guild {guild_id}");
        let document = GuildRolesDocument {
            id: None,
            guild_id: guild_id.to_string(),
            roles: Vec::new(),
            categories: Vec::new(),
            experiences: Vec::new(),
        };

        self.upsert_json(
            "INSERT OR REPLACE INTO roles (guild_id, data) VALUES (?1, ?2)",
            guild_id,
            &document,
        )
        .await?;

        Ok(document)
    }

    async fn persist_roles(&self, roles: &GuildRolesDocument) -> Result<(), ApiError> {
        debug!(
            "Persisting roles configuration with {} roles for guild {} in SQLite",
            roles.roles.len(),
            roles.guild_id
        );
        self.upsert_json(
            "INSERT OR REPLACE INTO roles (guild_id, data) VALUES (?1, ?2)",
            &roles.guild_id,
            roles,
        )
        .await
    }

    async fn delete_roles(&self, guild_id: &str) -> Result<Option<GuildRolesDocument>, ApiError> {
        debug!("Deleting roles configuration from SQLite for guild {guild_id}");
        let existing = self
            .read_json::<GuildRolesDocument>("SELECT data FROM roles WHERE guild_id = ?1", guild_id)
            .await?;

        if existing.is_some() {
            self.delete_row("DELETE FROM roles WHERE guild_id = ?1", guild_id)
                .await?;
            debug!("Removed roles configuration from SQLite for guild {guild_id}");
        }

        Ok(existing)
    }

    async fn get_or_init_settings(
        &self,
        guild_id: &str,
    ) -> Result<GuildSettingsDocument, ApiError> {
        debug!("Fetching settings for guild {guild_id} from SQLite");
        if let Some(document) = self
            .read_json::<GuildSettingsDocument>(
                "SELECT data FROM settings WHERE guild_id = ?1",
                guild_id,
            )
            .await?
        {
            return Ok(document);
        }

        debug!("No SQLite settings found; creating default for guild {guild_id}");
        let document = GuildSettingsDocument {
            id: None,
            guild_id: guild_id.to_string(),
            ..GuildSettingsDocument::default()
        };

        self.upsert_json(
            "INSERT OR REPLACE INTO settings (guild_id, data) VALUES (?1, ?2)",
            guild_id,
            &document,
        )
        .await?;

        Ok(document)
    }

    async fn persist_settings(&self, settings: &GuildSettingsDocument) -> Result<(), ApiError> {
        debug!(
            "Persisting settings document for guild {} in SQLite",
            settings.guild_id
        );
        self.upsert_json(
            "INSERT OR REPLACE INTO settings (guild_id, data) VALUES (?1, ?2)",
            &settings.guild_id,
            settings,
        )
        .await
    }

    async fn delete_settings(
        &self,
        guild_id: &str,
    ) -> Result<Option<GuildSettingsDocument>, ApiError> {
        debug!("Deleting settings from SQLite for guild {guild_id}");
        let existing = self
            .read_json::<GuildSettingsDocument>(
                "SELECT data FROM settings WHERE guild_id = ?1",
                guild_id,
            )
            .await?;

        if existing.is_some() {
            self.delete_row("DELETE FROM settings WHERE guild_id = ?1", guild_id)
                .await?;
            debug!("Removed settings from SQLite for guild {guild_id}");
        }

        Ok(existing)
    }

    async fn delete_workers(
        &self,
        guild_id: &str,
    ) -> Result<Option<GuildWorkersDocument>, ApiError> {
        debug!("Deleting workers roster from SQLite for guild {guild_id}");
        let existing = self
            .read_json::<GuildWorkersDocument>(
                "SELECT data FROM guild_workers WHERE guild_id = ?1",
                guild_id,
            )
            .await?;

        if existing.is_some() {
            self.delete_row("DELETE FROM guild_workers WHERE guild_id = ?1", guild_id)
                .await?;
            debug!("Removed workers roster for guild {guild_id}");
        }

        Ok(existing)
    }
}
