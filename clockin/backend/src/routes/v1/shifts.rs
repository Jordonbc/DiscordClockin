use actix_web::{HttpResponse, Responder, post, web};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct StartShiftRequest {
    pub guild_id: String,
    pub user_id: String,
    pub source: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct StartShiftResponse {
    pub message: String,
}

#[post("/shifts/start")]
pub async fn start_shift(payload: web::Json<StartShiftRequest>) -> impl Responder {
    let source = payload
        .source
        .clone()
        .unwrap_or_else(|| "unspecified".to_string());

    let response = StartShiftResponse {
        message: format!(
            "Shift start accepted for user {} in guild {} via {}",
            payload.user_id, payload.guild_id, source
        ),
    };

    HttpResponse::Ok().json(response)
}
