mod health;
mod shifts;
mod workers;

use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/v1")
            .service(health::healthcheck)
            .service(shifts::start_shift)
            .service(shifts::end_shift)
            .service(workers::register_worker)
            .service(workers::get_worker),
    );
}
