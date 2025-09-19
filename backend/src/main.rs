mod config;
mod error;
mod models;
mod repository;
mod routes;
mod state;

use actix_cors::Cors;
use actix_web::{App, HttpServer, middleware::Logger, web::Data};
use config::AppConfig;
use log::{debug, error, info};
use state::AppState;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    init_logging();

    info!("Bootstrapping ClockIn backend service");

    let app_config = AppConfig::from_env().expect("failed to load configuration");
    debug!(
        "Loaded server configuration host={:?} port={:?}",
        app_config.server.host, app_config.server.port
    );
    let bind_addr = format!("{}:{}", app_config.server.host, app_config.server.port);
    let state = AppState::initialize(app_config.clone())
        .await
        .expect("failed to initialize app state");
    info!("Application state initialized");
    let shared_state = Data::new(state);

    let server = HttpServer::new(move || {
        App::new()
            .app_data(shared_state.clone())
            .wrap(Logger::default())
            .wrap(Cors::permissive())
            .configure(routes::configure)
    })
    .bind(&bind_addr)?
    .run();

    info!("HTTP server listening on {bind_addr}");

    match server.await {
        Ok(()) => {
            info!("HTTP server shutdown completed");
            Ok(())
        }
        Err(err) => {
            error!("HTTP server exited with error: {err}");
            Err(err)
        }
    }
}

fn init_logging() {
    use env_logger::{Builder, Env};
    use std::io::Write;

    let env = Env::default().filter_or("RUST_LOG", "debug,actix_web=info");
    Builder::from_env(env)
        .format(|buf, record| {
            let timestamp = buf.timestamp_millis();
            let location = record
                .module_path()
                .or_else(|| record.file())
                .unwrap_or("unknown");

            if let Some(line) = record.line() {
                writeln!(
                    buf,
                    "{timestamp} [{:<5}] {}:{} - {}",
                    record.level(),
                    location,
                    line,
                    record.args()
                )
            } else {
                writeln!(
                    buf,
                    "{timestamp} [{:<5}] {} - {}",
                    record.level(),
                    location,
                    record.args()
                )
            }
        })
        .init();
}
