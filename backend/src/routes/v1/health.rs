use actix_web::{HttpResponse, Responder, get};
use log::info;

#[get("/health")]
pub async fn healthcheck() -> impl Responder {
    info!("Healthcheck endpoint invoked");
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "clockin-backend",
    }))
}
