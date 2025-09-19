use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub mongodb: MongoConfig,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let builder = Config::builder()
            .add_source(File::with_name("config").required(false))
            .add_source(Environment::with_prefix("APP").separator("__"));

        builder.build()?.try_deserialize()
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig::default(),
            mongodb: MongoConfig::default(),
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
