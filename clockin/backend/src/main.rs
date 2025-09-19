mod config;
mod error;
mod models;
mod routes;
mod state;

use actix_cors::Cors;
use actix_web::{App, HttpServer, middleware::Logger, web::Data};
use config::AppConfig;
use state::AppState;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    init_tracing();

    let app_config = AppConfig::from_env().expect("failed to load configuration");
    let bind_addr = format!("{}:{}", app_config.server.host, app_config.server.port);
    let state = AppState::initialize(app_config.clone())
        .await
        .expect("failed to initialize app state");
    let shared_state = Data::new(state);

    HttpServer::new(move || {
        App::new()
            .app_data(shared_state.clone())
            .wrap(Logger::default())
            .wrap(Cors::permissive())
            .configure(routes::configure)
    })
    .bind(bind_addr)?
    .run()
    .await
}

fn init_tracing() {
    use tracing_subscriber::{EnvFilter, fmt};

    let env_filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new("info"))
        .expect("failed to init env filter");

    fmt()
        .with_env_filter(env_filter)
        .with_target(false)
        .without_time()
        .init();
}
