mod health;
mod shifts;
mod timesheets;
mod workers;

use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/v1")
            .service(health::healthcheck)
            .service(shifts::start_shift)
            .service(shifts::end_shift)
            .service(shifts::start_break)
            .service(shifts::end_break)
            .service(timesheets::get_timesheet)
            .service(workers::register_worker)
            .service(workers::list_workers)
            .service(workers::get_worker),
    );
}
