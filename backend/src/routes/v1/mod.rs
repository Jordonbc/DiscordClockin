mod events;
mod health;
mod roles;
mod settings;
mod shifts;
mod timesheets;
mod workers;
mod workers_admin;

use actix_web::web;
use log::debug;

pub fn configure(cfg: &mut web::ServiceConfig) {
    debug!("Registering v1 API routes");
    cfg.service(
        web::scope("/v1")
            .service(health::healthcheck)
            .service(shifts::start_shift)
            .service(shifts::end_shift)
            .service(shifts::start_break)
            .service(shifts::end_break)
            .service(events::stream_events)
            .service(timesheets::get_timesheet)
            .service(workers::register_worker)
            .service(workers::list_workers)
            .service(workers::get_worker)
            .service(settings::get_settings)
            .service(settings::update_settings)
            .service(roles::get_roles)
            .service(roles::create_role)
            .service(roles::delete_role)
            .service(roles::add_experience)
            .service(roles::remove_experience)
            .service(workers_admin::add_hours)
            .service(workers_admin::remove_hours)
            .service(workers_admin::change_role)
            .service(workers_admin::delete_worker)
            .service(workers_admin::delete_all_workers)
            .service(workers_admin::delete_all_roles)
            .service(workers_admin::delete_all_data),
    );
}
