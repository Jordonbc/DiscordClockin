use std::collections::HashMap;

use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GuildRolesDocument {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    #[serde(rename = "guildId")]
    pub guild_id: String,
    #[serde(default)]
    pub roles: Vec<RoleEntry>,
    #[serde(default, rename = "categorys")]
    pub categories: Vec<String>,
    #[serde(default)]
    pub experiences: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RoleEntry {
    pub name: String,
    #[serde(rename = "hourlySalary", default)]
    pub hourly_salary: HashMap<String, f64>,
    pub category: String,
    pub id: String,
    #[serde(default)]
    pub experiences: Vec<String>,
}
