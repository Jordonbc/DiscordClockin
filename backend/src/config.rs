use std::str::FromStr;

use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let builder = Config::builder()
            .add_source(File::with_name("config").required(false))
            .add_source(Environment::with_prefix("APP").separator("__"));

        let mut config: AppConfig = builder.build()?.try_deserialize()?;

        if let Ok(raw_backend) = std::env::var("APP_DATABASE__BACKEND") {
            let parsed = DatabaseBackend::from_str(raw_backend.trim()).map_err(|err| {
                ConfigError::Message(format!("invalid APP_DATABASE__BACKEND value: {err}"))
            })?;

            config.database.backend = parsed;
        }

        Ok(config)
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig::default(),
            database: DatabaseConfig::default(),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(default)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: default_host(),
            port: default_port(),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(default)]
pub struct DatabaseConfig {
    pub backend: DatabaseBackend,
    pub mongodb: MongoConfig,
    pub sqlite: SqliteConfig,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            backend: DatabaseBackend::Mongo,
            mongodb: MongoConfig::default(),
            sqlite: SqliteConfig::default(),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseBackend {
    Mongo,
    Sqlite,
}

impl FromStr for DatabaseBackend {
    type Err = &'static str;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.to_ascii_lowercase().as_str() {
            "mongo" => Ok(DatabaseBackend::Mongo),
            "sqlite" => Ok(DatabaseBackend::Sqlite),
            _ => Err("expected 'mongo' or 'sqlite'"),
        }
    }
}

impl Default for DatabaseBackend {
    fn default() -> Self {
        DatabaseBackend::Mongo
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(default)]
pub struct MongoConfig {
    pub uri: String,
    pub database: String,
}

impl Default for MongoConfig {
    fn default() -> Self {
        Self {
            uri: default_mongo_uri(),
            database: default_mongo_db(),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(default)]
pub struct SqliteConfig {
    pub path: String,
}

impl Default for SqliteConfig {
    fn default() -> Self {
        Self {
            path: default_sqlite_path(),
        }
    }
}

fn default_host() -> String {
    "0.0.0.0".to_string()
}

fn default_port() -> u16 {
    8080
}

fn default_mongo_uri() -> String {
    "mongodb://localhost:27017".to_string()
}

fn default_mongo_db() -> String {
    "clockin".to_string()
}

fn default_sqlite_path() -> String {
    "./data/clockin.sqlite".to_string()
}
