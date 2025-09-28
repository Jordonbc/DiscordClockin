use std::collections::HashMap;
use std::sync::Arc;

use actix_web::{HttpResponse, get, web};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::error::ApiError;
use crate::models::guild_worker::{GuildWorkersDocument, WorkerRecord};
use crate::models::roles::{GuildRolesDocument, RoleEntry};
use crate::models::views::GuildSettingsView;
use crate::repository::Repository;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct AdminOverviewResponse {
    pub performance: PerformanceSnapshot,
    pub departments: Vec<DepartmentSummary>,
    pub roles: Vec<RoleSummary>,
    pub developers: Vec<DeveloperSummary>,
    pub offboarding: Vec<OffboardingCase>,
    pub time_entries: Vec<TimeEntrySummary>,
    pub holidays: Vec<HolidayOverviewEntry>,
    pub generated_at: i64,
}

#[derive(Debug, Serialize)]
pub struct PerformanceSnapshot {
    pub total_developers: usize,
    pub meeting_goals: usize,
    pub overtime_logged_hours: f64,
    pub active_developers: usize,
    pub on_leave: usize,
    pub lagging_developers: usize,
}

#[derive(Debug, Serialize)]
pub struct DepartmentSummary {
    pub id: String,
    pub name: String,
    pub roles_count: usize,
    pub member_count: usize,
}

#[derive(Debug, Serialize)]
pub struct RoleSummary {
    pub id: String,
    pub name: String,
    pub category: String,
    pub experience_levels: usize,
    pub hourly_rate_low: Option<f64>,
    pub hourly_rate_high: Option<f64>,
    pub member_count: usize,
}

#[derive(Debug, Serialize)]
pub struct DeveloperSummary {
    pub user_id: String,
    pub member_label: String,
    pub status: String,
    pub role_id: String,
    pub role_name: Option<String>,
    pub experience: Option<String>,
    pub daily_hours: f64,
    pub weekly_hours: f64,
    pub total_hours: f64,
    pub break_hours: f64,
    pub meeting_goal_met: bool,
    pub overtime_hours: f64,
    pub on_leave: bool,
    pub active_session: bool,
    pub compliance_status: ComplianceStatus,
    pub last_activity: Option<i64>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ComplianceStatus {
    OnTrack,
    Warning,
    Critical,
}

#[derive(Debug, Serialize)]
pub struct OffboardingCase {
    pub user_id: String,
    pub member_label: String,
    pub role_name: Option<String>,
    pub status: String,
    pub reason: String,
    pub effective_date: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct TimeEntrySummary {
    pub user_id: String,
    pub member_label: String,
    pub role_name: Option<String>,
    pub started_at_ms: i64,
    pub ended_at_ms: Option<i64>,
    pub duration_minutes: f64,
    pub summary: Option<String>,
    pub status: String,
    pub admin_note: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HolidayOverviewEntry {
    pub user_id: String,
    pub member_label: String,
    pub status: String,
    pub start: Option<i64>,
    pub end: Option<i64>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminPath {
    pub guild_id: String,
}

#[get("/admin/overview/{guild_id}")]
pub async fn get_admin_overview(
    state: web::Data<AppState>,
    path: web::Path<AdminPath>,
) -> Result<HttpResponse, ApiError> {
    let repository: Arc<dyn Repository> = state.repository.clone();
    let guild_id = path.into_inner().guild_id;

    let workers = repository
        .find_workers(&guild_id)
        .await?
        .unwrap_or_else(|| GuildWorkersDocument {
            id: None,
            guild_id: guild_id.clone(),
            workers: Vec::new(),
        });

    let roles = repository
        .get_roles(&guild_id)
        .await?
        .unwrap_or_else(|| GuildRolesDocument {
            id: None,
            guild_id: guild_id.clone(),
            roles: Vec::new(),
            categories: Vec::new(),
            experiences: Vec::new(),
        });

    let settings = repository.get_or_init_settings(&guild_id).await?;
    let settings_view = GuildSettingsView::from(&settings);
    let target_hours = settings_view.target_hours.unwrap_or(40) as f64;

    let role_lookup = build_role_lookup(&roles);

    let departments = build_departments(&roles, &workers, &role_lookup);
    let mut role_summaries = build_roles(&roles, &role_lookup);
    augment_role_members(&workers, &role_lookup, &mut role_summaries);

    let developer_details = build_developers(&workers, &role_lookup, target_hours);
    let performance = summarize_performance(&developer_details);
    let offboarding = build_offboarding(&developer_details);
    let time_entries = build_time_entries(&workers, &role_lookup);
    let holidays = build_holidays(&workers);

    let response = AdminOverviewResponse {
        performance,
        departments,
        roles: role_summaries,
        developers: developer_details,
        offboarding,
        time_entries,
        holidays,
        generated_at: Utc::now().timestamp_millis(),
    };

    Ok(HttpResponse::Ok().json(response))
}

fn build_role_lookup<'a>(roles: &'a GuildRolesDocument) -> HashMap<String, &'a RoleEntry> {
    let mut lookup = HashMap::new();
    for role in &roles.roles {
        lookup.insert(role.id.to_lowercase(), role);
    }
    lookup
}

fn build_departments(
    roles: &GuildRolesDocument,
    workers: &GuildWorkersDocument,
    role_lookup: &HashMap<String, &RoleEntry>,
) -> Vec<DepartmentSummary> {
    let mut counts: HashMap<String, DepartmentSummary> = HashMap::new();

    for category in &roles.categories {
        let key = category_key(category);
        counts
            .entry(key.clone())
            .or_insert_with(|| DepartmentSummary {
                id: key,
                name: category.clone(),
                roles_count: 0,
                member_count: 0,
            });
    }

    for role in &roles.roles {
        let category = if role.category.trim().is_empty() {
            "Unassigned"
        } else {
            role.category.trim()
        };
        let key = category_key(category);
        let entry = counts
            .entry(key.clone())
            .or_insert_with(|| DepartmentSummary {
                id: key,
                name: category.to_string(),
                roles_count: 0,
                member_count: 0,
            });
        entry.roles_count += 1;
    }

    for worker in &workers.workers {
        if let Some(role) = role_lookup.get(&worker.role_id.to_lowercase()) {
            let category = if role.category.trim().is_empty() {
                "Unassigned"
            } else {
                role.category.trim()
            };
            let key = category_key(category);
            let entry = counts
                .entry(key.clone())
                .or_insert_with(|| DepartmentSummary {
                    id: key,
                    name: category.to_string(),
                    roles_count: 0,
                    member_count: 0,
                });
            entry.member_count += 1;
        }
    }

    let mut summaries: Vec<_> = counts.into_values().collect();
    summaries.sort_by(|a, b| a.name.cmp(&b.name));
    summaries
}

fn build_roles(
    roles: &GuildRolesDocument,
    role_lookup: &HashMap<String, &RoleEntry>,
) -> Vec<RoleSummary> {
    let mut summaries = Vec::new();
    for role in &roles.roles {
        let mut rates: Vec<f64> = role.hourly_salary.values().copied().collect();
        rates.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let hourly_rate_low = rates.first().copied();
        let hourly_rate_high = rates.last().copied();
        summaries.push(RoleSummary {
            id: role.id.clone(),
            name: role.name.clone(),
            category: if role.category.trim().is_empty() {
                "Unassigned".to_string()
            } else {
                role.category.trim().to_string()
            },
            experience_levels: role.experiences.len(),
            hourly_rate_low,
            hourly_rate_high,
            member_count: 0,
        });
    }

    // Include uncategorized placeholder if there are workers referencing an unknown role
    for key in role_lookup.keys() {
        if !summaries
            .iter()
            .any(|summary| summary.id.eq_ignore_ascii_case(key))
        {
            if let Some(role) = role_lookup.get(key) {
                let mut rates: Vec<f64> = role.hourly_salary.values().copied().collect();
                rates.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
                summaries.push(RoleSummary {
                    id: role.id.clone(),
                    name: role.name.clone(),
                    category: if role.category.trim().is_empty() {
                        "Unassigned".to_string()
                    } else {
                        role.category.trim().to_string()
                    },
                    experience_levels: role.experiences.len(),
                    hourly_rate_low: rates.first().copied(),
                    hourly_rate_high: rates.last().copied(),
                    member_count: 0,
                });
            }
        }
    }

    summaries.sort_by(|a, b| a.name.cmp(&b.name));
    summaries
}

fn augment_role_members(
    workers: &GuildWorkersDocument,
    role_lookup: &HashMap<String, &RoleEntry>,
    summaries: &mut Vec<RoleSummary>,
) {
    for worker in &workers.workers {
        let target = worker.role_id.to_lowercase();
        if let Some(summary) = summaries
            .iter_mut()
            .find(|summary| summary.id.eq_ignore_ascii_case(&target))
        {
            summary.member_count += 1;
        } else if let Some(role) = role_lookup.get(&target) {
            summaries.push(RoleSummary {
                id: role.id.clone(),
                name: role.name.clone(),
                category: if role.category.trim().is_empty() {
                    "Unassigned".to_string()
                } else {
                    role.category.trim().to_string()
                },
                experience_levels: role.experiences.len(),
                hourly_rate_low: role.hourly_salary.values().copied().reduce(|a, b| a.min(b)),
                hourly_rate_high: role.hourly_salary.values().copied().reduce(|a, b| a.max(b)),
                member_count: 1,
            });
        }
    }

    summaries.sort_by(|a, b| a.name.cmp(&b.name));
}

fn build_developers(
    workers: &GuildWorkersDocument,
    role_lookup: &HashMap<String, &RoleEntry>,
    target_hours: f64,
) -> Vec<DeveloperSummary> {
    let mut developers = Vec::new();
    for worker in &workers.workers {
        let role = role_lookup.get(&worker.role_id.to_lowercase());
        let meeting_goal = worker.weekly_worked >= target_hours && target_hours > 0.0;
        let overtime_hours = if worker.weekly_worked > target_hours {
            worker.weekly_worked - target_hours
        } else {
            0.0
        };
        let on_leave = worker.on_leave.start.is_some();
        let active_session = worker.clock_dates.clock_in.len() > worker.clock_dates.clock_out.len();
        let compliance_status =
            resolve_compliance(worker.weekly_worked, target_hours, meeting_goal);
        let last_activity = worker
            .clock_dates
            .clock_in
            .last()
            .copied()
            .or_else(|| worker.clock_dates.clock_out.last().copied());

        developers.push(DeveloperSummary {
            user_id: worker.user_id.clone(),
            member_label: format_worker_label(worker),
            status: worker.status.clone(),
            role_id: worker.role_id.clone(),
            role_name: role.map(|role| role.name.clone()),
            experience: worker.experience.clone(),
            daily_hours: worker.daily_worked,
            weekly_hours: worker.weekly_worked,
            total_hours: worker.total_worked,
            break_hours: worker.break_time,
            meeting_goal_met: meeting_goal,
            overtime_hours,
            on_leave,
            active_session,
            compliance_status,
            last_activity,
        });
    }

    developers.sort_by(|a, b| {
        b.weekly_hours
            .partial_cmp(&a.weekly_hours)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    developers
}

fn resolve_compliance(
    weekly_hours: f64,
    target_hours: f64,
    meeting_goal: bool,
) -> ComplianceStatus {
    if meeting_goal {
        return ComplianceStatus::OnTrack;
    }

    if target_hours <= 0.0 {
        return ComplianceStatus::Warning;
    }

    let ratio = weekly_hours / target_hours;
    if ratio >= 0.75 {
        ComplianceStatus::Warning
    } else {
        ComplianceStatus::Critical
    }
}

fn summarize_performance(developers: &[DeveloperSummary]) -> PerformanceSnapshot {
    let total_developers = developers.len();
    let meeting_goals = developers.iter().filter(|dev| dev.meeting_goal_met).count();
    let overtime_logged_hours = developers
        .iter()
        .map(|dev| dev.overtime_hours.max(0.0))
        .sum();
    let active_developers = developers
        .iter()
        .filter(|dev| dev.status.eq_ignore_ascii_case("work"))
        .count();
    let on_leave = developers.iter().filter(|dev| dev.on_leave).count();
    let lagging_developers = developers
        .iter()
        .filter(|dev| dev.compliance_status == ComplianceStatus::Critical)
        .count();

    PerformanceSnapshot {
        total_developers,
        meeting_goals,
        overtime_logged_hours,
        active_developers,
        on_leave,
        lagging_developers,
    }
}

fn build_offboarding(developers: &[DeveloperSummary]) -> Vec<OffboardingCase> {
    developers
        .iter()
        .filter(|dev| dev.compliance_status == ComplianceStatus::Critical)
        .map(|dev| OffboardingCase {
            user_id: dev.user_id.clone(),
            member_label: dev.member_label.clone(),
            role_name: dev.role_name.clone(),
            status: "Needs review".to_string(),
            reason: "Weekly hours below expectations".to_string(),
            effective_date: dev.last_activity,
        })
        .collect()
}

fn build_time_entries(
    workers: &GuildWorkersDocument,
    role_lookup: &HashMap<String, &RoleEntry>,
) -> Vec<TimeEntrySummary> {
    let mut entries: Vec<TimeEntrySummary> = Vec::new();

    for worker in &workers.workers {
        let role_name = role_lookup
            .get(&worker.role_id.to_lowercase())
            .map(|role| role.name.clone());

        for (index, start) in worker.clock_dates.clock_in.iter().enumerate() {
            let end = worker.clock_dates.clock_out.get(index).copied();
            let summary = worker
                .clock_dates
                .clock_summary
                .get(index)
                .cloned()
                .filter(|value| !value.trim().is_empty());
            let status = if end.is_some() {
                "Completed".to_string()
            } else {
                "Active".to_string()
            };
            let duration = match end {
                Some(end_ts) => minutes_between(*start, end_ts),
                None => minutes_between(*start, Utc::now().timestamp_millis()),
            };

            let admin_note = if status == "Active" {
                Some("Pending completion".to_string())
            } else {
                None
            };

            entries.push(TimeEntrySummary {
                user_id: worker.user_id.clone(),
                member_label: format_worker_label(worker),
                role_name: role_name.clone(),
                started_at_ms: *start,
                ended_at_ms: end,
                duration_minutes: duration,
                summary,
                status,
                admin_note,
            });
        }
    }

    entries.sort_by(|a, b| b.started_at_ms.cmp(&a.started_at_ms));
    entries.truncate(25);
    entries
}

fn build_holidays(workers: &GuildWorkersDocument) -> Vec<HolidayOverviewEntry> {
    let mut holidays = Vec::new();

    for worker in &workers.workers {
        if worker.on_leave.start.is_none() && worker.on_leave.end.is_none() {
            continue;
        }

        let start_time = parse_timestamp(worker.on_leave.start.as_deref());
        let end_time = parse_timestamp(worker.on_leave.end.as_deref());
        let status = resolve_leave_status(start_time, end_time);
        holidays.push(HolidayOverviewEntry {
            user_id: worker.user_id.clone(),
            member_label: format_worker_label(worker),
            status,
            start: start_time.map(|value| value.timestamp_millis()),
            end: end_time.map(|value| value.timestamp_millis()),
            note: worker.afk_message.clone(),
        });
    }

    holidays.sort_by(|a, b| a.start.cmp(&b.start));
    holidays
}

fn resolve_leave_status(start: Option<DateTime<Utc>>, end: Option<DateTime<Utc>>) -> String {
    let now = Utc::now();

    if let Some(start_time) = start {
        if let Some(end_time) = end {
            if now >= start_time && now <= end_time {
                return "On leave".to_string();
            }
            if now < start_time {
                return "Scheduled".to_string();
            }
            if now > end_time {
                return "Completed".to_string();
            }
        } else if now < start_time {
            return "Scheduled".to_string();
        } else {
            return "On leave".to_string();
        }
    }

    if end.is_some() {
        "Completed".to_string()
    } else {
        "Scheduled".to_string()
    }
}

fn parse_timestamp(input: Option<&str>) -> Option<DateTime<Utc>> {
    let value = input?.trim();
    if value.is_empty() {
        return None;
    }

    DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.with_timezone(&Utc))
        .or_else(|_| {
            DateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S").map(|dt| dt.with_timezone(&Utc))
        })
        .ok()
}

fn minutes_between(start: i64, end: i64) -> f64 {
    ((end - start) as f64 / 1000.0 / 60.0).max(0.0)
}

fn category_key(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

fn format_worker_label(worker: &WorkerRecord) -> String {
    if let Some(label) = clean_label(worker.display_name.as_deref()) {
        return label;
    }

    if let Some(label) = clean_label(worker.global_name.as_deref()) {
        return label;
    }

    if let Some(label) = clean_label(worker.nickname.as_deref()) {
        return label;
    }

    if let Some(label) = clean_label(worker.user_tag.as_deref()) {
        return label;
    }

    if let Some(full_name) =
        build_full_name(worker.first_name.as_deref(), worker.last_name.as_deref())
    {
        return full_name;
    }

    if let Some(username) = clean_label(worker.username.as_deref()) {
        if let Some(discriminator) = worker
            .discriminator
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty() && *value != "0")
        {
            return format!("{username}#{discriminator}");
        }
        return username;
    }

    fallback_member_label(&worker.user_id)
}

fn clean_label(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|candidate| !candidate.is_empty())
        .map(|candidate| candidate.to_string())
}

fn build_full_name(first: Option<&str>, last: Option<&str>) -> Option<String> {
    let first = first.map(str::trim).filter(|value| !value.is_empty());
    let last = last.map(str::trim).filter(|value| !value.is_empty());

    match (first, last) {
        (Some(first), Some(last)) => Some(format!("{first} {last}")),
        (Some(first), None) => Some(first.to_string()),
        (None, Some(last)) => Some(last.to_string()),
        (None, None) => None,
    }
}

fn fallback_member_label(user_id: &str) -> String {
    if user_id.len() <= 6 {
        return user_id.to_string();
    }
    let tail = &user_id[user_id.len().saturating_sub(4)..];
    format!("User #{tail}")
}
