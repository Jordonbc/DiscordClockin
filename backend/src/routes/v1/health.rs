use actix_web::{HttpResponse, Responder, get};

#[get("/health")]
pub async fn healthcheck() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "clockin-backend",
    }))
}
