import {
  adminTabButtons,
  adminSections,
  adminDepartmentsContainer,
  adminRolesContainer,
  adminDevelopersContainer,
  adminOffboardingContainer,
  adminPerformanceMetrics,
  adminPerformanceDetails,
  adminTimeEntriesContainer,
  adminHolidayOverview,
} from "../dom";
import { state } from "../state";
import { formatDateTime, formatHours, formatTimeRange } from "../utils/formatters";
import type { AdminDeveloperSummary } from "../types";

export function renderAdminOverview(): void {
  updateTabVisibility();
  renderDepartments();
  renderRoles();
  renderDevelopers();
  renderOffboarding();
  renderPerformance();
  renderTimeEntries();
  renderHolidayOverview();
}

export function updateTabVisibility(): void {
  const activeTab = state.adminActiveTab;
  adminTabButtons.forEach((button) => {
    const tab = button.dataset.adminTab;
    button.classList.toggle("is-active", tab === activeTab);
  });

  adminSections.forEach((section) => {
    const tab = section.dataset.adminSection;
    const isActive = tab === activeTab;
    section.hidden = !isActive;
  });
}

function renderDepartments(): void {
  if (!adminDepartmentsContainer) return;
  const container = adminDepartmentsContainer;
  container.innerHTML = "";

  if (state.adminOverviewLoading) {
    container.appendChild(buildLoadingState("Loading departments…"));
    return;
  }

  const overview = state.adminOverview;
  if (state.adminOverviewError) {
    container.appendChild(
      buildEmptyState("⚠️", "Unable to load departments.", state.adminOverviewError || undefined),
    );
    return;
  }

  if (!overview || !overview.departments.length) {
    container.appendChild(
      buildEmptyState("🏢", "No departments yet.", "Create your first department to begin."),
    );
    return;
  }

  overview.departments.forEach((department) => {
    const card = document.createElement("article");
    card.className = "admin-card";
    card.dataset.departmentId = department.id;

    const header = document.createElement("div");
    header.className = "admin-card__header";

    const title = document.createElement("h4");
    title.className = "admin-card__title";
    title.textContent = department.name;

    const actions = document.createElement("div");
    actions.className = "admin-card__actions";

    const editButton = createDepartmentActionButton({
      label: `Edit ${department.name}`,
      icon: "edit",
    });
    editButton.dataset.departmentAction = "edit";
    editButton.dataset.departmentId = department.id;

    const deleteButton = createDepartmentActionButton({
      label: `Delete ${department.name}`,
      icon: "trash",
      tone: "danger",
    });
    deleteButton.dataset.departmentAction = "delete";
    deleteButton.dataset.departmentId = department.id;

    actions.append(editButton, deleteButton);
    header.append(title, actions);

    const roles = document.createElement("p");
    roles.className = "admin-card__meta";
    roles.textContent = `${department.roles_count} role${department.roles_count === 1 ? "" : "s"}`;

    const members = document.createElement("p");
    members.className = "admin-card__meta";
    members.textContent = `${department.member_count} member${department.member_count === 1 ? "" : "s"}`;

    card.append(header, roles, members);
    container.appendChild(card);
  });
}

function createDepartmentActionButton(options: {
  label: string;
  icon: "edit" | "trash";
  tone?: "danger";
}): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "admin-card__icon-button" + (options.tone === "danger" ? " admin-card__icon-button--danger" : "");
  button.setAttribute("aria-label", options.label);

  const srLabel = document.createElement("span");
  srLabel.className = "sr-only";
  srLabel.textContent = options.label;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("admin-card__icon");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  if (options.icon === "edit") {
    path.setAttribute(
      "d",
      "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125",
    );
  } else {
    path.setAttribute(
      "d",
      "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0",
    );
  }

  svg.append(path);
  button.append(srLabel, svg);
  return button;
}

function renderRoles(): void {
  if (!adminRolesContainer) return;
  const container = adminRolesContainer;
  container.innerHTML = "";

  if (state.adminOverviewLoading) {
    container.appendChild(buildLoadingState("Loading roles…"));
    return;
  }

  const overview = state.adminOverview;
  if (state.adminOverviewError) {
    container.appendChild(
      buildEmptyState("⚠️", "Unable to load roles.", state.adminOverviewError || undefined),
    );
    return;
  }

  if (!overview || !overview.roles.length) {
    container.appendChild(
      buildEmptyState("🧩", "No roles yet.", "Add roles to configure compensation bands."),
    );
    return;
  }

  overview.roles.forEach((role) => {
    const card = document.createElement("article");
    card.className = "admin-card";

    const title = document.createElement("h4");
    title.className = "admin-card__title";
    title.textContent = role.name;

    const category = document.createElement("p");
    category.className = "admin-card__meta";
    category.textContent = `Category: ${role.category}`;

    const experience = document.createElement("p");
    experience.className = "admin-card__meta";
    experience.textContent = `${role.experience_levels} experience tier${
      role.experience_levels === 1 ? "" : "s"
    }`;

    const rateRange = document.createElement("p");
    rateRange.className = "admin-card__meta";
    if (typeof role.hourly_rate_low === "number" && typeof role.hourly_rate_high === "number") {
      rateRange.textContent = `Rate: $${role.hourly_rate_low.toFixed(2)} – $${role.hourly_rate_high.toFixed(2)}/hr`;
    } else if (typeof role.hourly_rate_low === "number") {
      rateRange.textContent = `Rate: from $${role.hourly_rate_low.toFixed(2)}/hr`;
    } else {
      rateRange.textContent = "Rate: Not configured";
    }

    const members = document.createElement("p");
    members.className = "admin-card__meta";
    members.textContent = `${role.member_count} assigned developer${role.member_count === 1 ? "" : "s"}`;

    card.append(title, category, experience, rateRange, members);
    container.appendChild(card);
  });
}

function renderDevelopers(): void {
  if (!adminDevelopersContainer) return;
  const container = adminDevelopersContainer;
  container.innerHTML = "";

  if (state.adminOverviewLoading) {
    container.appendChild(buildLoadingState("Loading developers…"));
    return;
  }

  const overview = state.adminOverview;
  if (state.adminOverviewError) {
    container.appendChild(
      buildEmptyState("⚠️", "Unable to load developers.", state.adminOverviewError || undefined),
    );
    return;
  }

  if (!overview || !overview.developers.length) {
    container.appendChild(
      buildEmptyState("👥", "No developers registered.", "Use the Discord bot to onboard your first worker."),
    );
    return;
  }

  overview.developers.forEach((developer) => {
    container.appendChild(buildDeveloperEntry(developer));
  });
}

function renderOffboarding(): void {
  if (!adminOffboardingContainer) return;
  const container = adminOffboardingContainer;
  container.innerHTML = "";

  if (state.adminOverviewLoading) {
    container.appendChild(buildLoadingState("Loading offboarding data…"));
    return;
  }

  const overview = state.adminOverview;
  if (state.adminOverviewError) {
    container.appendChild(
      buildEmptyState("⚠️", "Unable to load offboarding data.", state.adminOverviewError || undefined),
    );
    return;
  }

  if (!overview || !overview.offboarding.length) {
    container.appendChild(
      buildEmptyState(
        "📄",
        "No offboarding cases.",
        "Everyone is currently in good standing.",
      ),
    );
    return;
  }

  overview.offboarding.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "admin-entry";

    const header = document.createElement("div");
    header.className = "admin-entry__header";

    const title = document.createElement("h4");
    title.className = "admin-entry__name";
    title.textContent = entry.member_label;

    const badges = document.createElement("div");
    badges.className = "admin-badges";
    badges.appendChild(createBadge(entry.status, "warning"));

    header.append(title, badges);

    const role = document.createElement("p");
    role.className = "admin-entry__subtitle";
    role.textContent = entry.role_name ? entry.role_name : "Role pending";

    const reason = document.createElement("p");
    reason.className = "admin-entry__meta";
    reason.textContent = entry.reason;

    if (typeof entry.effective_date === "number") {
      const effective = document.createElement("p");
      effective.className = "admin-entry__meta";
      effective.textContent = `Effective: ${formatDateTime(entry.effective_date)}`;
      card.append(header, role, reason, effective);
    } else {
      card.append(header, role, reason);
    }

    container.appendChild(card);
  });
}

function renderPerformance(): void {
  if (adminPerformanceMetrics) {
    adminPerformanceMetrics.innerHTML = "";
  }
  if (adminPerformanceDetails) {
    adminPerformanceDetails.innerHTML = "";
  }

  if (!adminPerformanceMetrics || !adminPerformanceDetails) {
    return;
  }

  if (state.adminOverviewLoading) {
    adminPerformanceMetrics.appendChild(buildLoadingState("Calculating performance…"));
    adminPerformanceDetails.appendChild(buildLoadingState("Preparing developer summaries…"));
    return;
  }

  const overview = state.adminOverview;
  if (state.adminOverviewError) {
    adminPerformanceMetrics.appendChild(
      buildEmptyState("⚠️", "Unable to calculate performance.", state.adminOverviewError || undefined),
    );
    adminPerformanceDetails.appendChild(
      buildEmptyState("⚠️", "Unable to load developers.", state.adminOverviewError || undefined),
    );
    return;
  }

  if (!overview) {
    adminPerformanceMetrics.appendChild(
      buildEmptyState("📊", "No data yet.", "Performance metrics will appear once developers clock in."),
    );
    adminPerformanceDetails.appendChild(
      buildEmptyState("🧑‍💻", "No developer summaries.", "Add developers to start tracking weekly targets."),
    );
    return;
  }

  const metrics = [
    {
      label: "Total Developers",
      value: overview.performance.total_developers.toString(),
      hint: "Active worker records",
    },
    {
      label: "Meeting Goals",
      value: overview.performance.meeting_goals.toString(),
      hint: "Weekly targets met",
    },
    {
      label: "Overtime Logged",
      value: formatHours(overview.performance.overtime_logged_hours),
      hint: "Weekly overtime hours",
    },
    {
      label: "Active Engagement",
      value: overview.performance.active_developers.toString(),
      hint: "Currently working",
    },
    {
      label: "On Leave",
      value: overview.performance.on_leave.toString(),
      hint: "Scheduled or active leave",
    },
    {
      label: "Lag Compliance",
      value: overview.performance.lagging_developers.toString(),
      hint: "Needs intervention",
    },
  ];

  metrics.forEach((metric) => {
    const card = document.createElement("article");
    card.className = "admin-metric";

    const label = document.createElement("p");
    label.className = "admin-metric__label";
    label.textContent = metric.label;

    const value = document.createElement("p");
    value.className = "admin-metric__value";
    value.textContent = metric.value;

    const hint = document.createElement("p");
    hint.className = "admin-metric__hint";
    hint.textContent = metric.hint;

    card.append(label, value, hint);
    adminPerformanceMetrics.appendChild(card);
  });

  if (!overview.developers.length) {
    adminPerformanceDetails.appendChild(
      buildEmptyState(
        "🧑‍💻",
        "No developer analysis yet.",
        "Add developers to compare planned versus actual hours.",
      ),
    );
    return;
  }

  overview.developers.forEach((developer) => {
    adminPerformanceDetails.appendChild(buildDeveloperEntry(developer, true));
  });
}

function renderTimeEntries(): void {
  if (!adminTimeEntriesContainer) return;
  const container = adminTimeEntriesContainer;
  container.innerHTML = "";

  if (state.adminOverviewLoading) {
    container.appendChild(buildLoadingState("Loading time entries…"));
    return;
  }

  const overview = state.adminOverview;
  if (state.adminOverviewError) {
    container.appendChild(
      buildEmptyState("⚠️", "Unable to load time entries.", state.adminOverviewError || undefined),
    );
    return;
  }

  if (!overview || !overview.time_entries.length) {
    container.appendChild(
      buildEmptyState(
        "🕒",
        "No time entries yet.",
        "Clock-in sessions will appear here once developers log time.",
      ),
    );
    return;
  }

  overview.time_entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "admin-entry";

    const header = document.createElement("div");
    header.className = "admin-entry__header";

    const title = document.createElement("h4");
    title.className = "admin-entry__name";
    title.textContent = entry.member_label;

    const badges = document.createElement("div");
    badges.className = "admin-badges";
    const statusVariant = entry.status === "Completed" ? "success" : entry.status === "Active" ? "warning" : "default";
    badges.appendChild(createBadge(entry.status, statusVariant));

    header.append(title, badges);

    const subtitle = document.createElement("p");
    subtitle.className = "admin-entry__subtitle";
    subtitle.textContent = entry.role_name || "No role assigned";

    const when = document.createElement("p");
    when.className = "admin-entry__meta";
    when.textContent = `${formatDateTime(entry.started_at_ms)} (${formatTimeRange(entry.started_at_ms, entry.ended_at_ms ?? null)})`;

    const duration = document.createElement("p");
    duration.className = "admin-entry__meta";
    duration.textContent = `Duration: ${formatHours(entry.duration_minutes / 60)}`;

    const summary = document.createElement("p");
    summary.className = "admin-entry__meta";
    summary.textContent = entry.summary || "No summary provided.";

    card.append(header, subtitle, when, duration, summary);

    if (entry.admin_note) {
      const note = document.createElement("p");
      note.className = "admin-entry__meta";
      note.textContent = `Manager note: ${entry.admin_note}`;
      card.appendChild(note);
    }

    container.appendChild(card);
  });
}

function renderHolidayOverview(): void {
  if (!adminHolidayOverview) return;
  const list = adminHolidayOverview;
  list.innerHTML = "";

  if (state.adminOverviewLoading) {
    const item = document.createElement("li");
    item.className = "admin-timeline__item";
    item.appendChild(buildLoadingState("Loading leave windows…"));
    list.appendChild(item);
    return;
  }

  const overview = state.adminOverview;
  if (state.adminOverviewError) {
    const errorItem = document.createElement("li");
    errorItem.className = "admin-timeline__item";
    errorItem.appendChild(
      buildEmptyState("⚠️", "Unable to load holiday overview.", state.adminOverviewError || undefined),
    );
    list.appendChild(errorItem);
    return;
  }

  if (!overview || !overview.holidays.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "admin-timeline__item";
    const empty = buildEmptyState(
      "🌴",
      "No upcoming leave requests.",
      "Approved leave will appear once recorded.",
    );
    emptyItem.appendChild(empty);
    list.appendChild(emptyItem);
    return;
  }

  overview.holidays.forEach((holiday) => {
    const item = document.createElement("li");
    item.className = "admin-timeline__item";

    const title = document.createElement("p");
    title.className = "admin-timeline__title";
    title.textContent = `${holiday.member_label} • ${holiday.status}`;

    const range = document.createElement("p");
    range.className = "admin-timeline__meta";
    const startText = holiday.start ? formatDateTime(holiday.start) : "Pending";
    const endText = holiday.end ? formatDateTime(holiday.end) : "TBD";
    range.textContent = `${startText} → ${endText}`;

    item.append(title, range);

    if (holiday.note) {
      const note = document.createElement("p");
      note.className = "admin-timeline__meta";
      note.textContent = holiday.note;
      item.appendChild(note);
    }

    list.appendChild(item);
  });
}

function buildDeveloperEntry(developer: AdminDeveloperSummary, detailed = false): HTMLElement {
  const entry = document.createElement("article");
  entry.className = "admin-entry";

  const header = document.createElement("div");
  header.className = "admin-entry__header";

  const title = document.createElement("h4");
  title.className = "admin-entry__name";
  title.textContent = developer.member_label;

  const badges = document.createElement("div");
  badges.className = "admin-badges";

  if (developer.meeting_goal_met) {
    badges.appendChild(createBadge("On Track", "success"));
  } else if (developer.compliance_status === "critical") {
    badges.appendChild(createBadge("Critical", "critical"));
  } else {
    badges.appendChild(createBadge("Monitoring", "warning"));
  }

  if (developer.active_session) {
    badges.appendChild(createBadge("Active", "success"));
  }

  if (developer.on_leave) {
    badges.appendChild(createBadge("On Leave", "warning"));
  }

  header.append(title, badges);

  const subtitle = document.createElement("p");
  subtitle.className = "admin-entry__subtitle";
  const roleText = developer.role_name ? developer.role_name : "No role assigned";
  const experienceText = developer.experience ? ` • ${developer.experience}` : "";
  subtitle.textContent = `${roleText}${experienceText}`;

  const stats = document.createElement("p");
  stats.className = "admin-entry__meta";
  stats.textContent = `Daily: ${formatHours(developer.daily_hours)} • Weekly: ${formatHours(
    developer.weekly_hours,
  )} • Total: ${formatHours(developer.total_hours)}`;

  const breaks = document.createElement("p");
  breaks.className = "admin-entry__meta";
  breaks.textContent = `Breaks: ${formatHours(developer.break_hours)}`;

  entry.append(header, subtitle, stats, breaks);

  if (detailed) {
    const overtime = document.createElement("p");
    overtime.className = "admin-entry__meta";
    overtime.textContent = `Overtime: ${formatHours(developer.overtime_hours)}`;
    entry.appendChild(overtime);

    if (typeof developer.last_activity === "number") {
      const last = document.createElement("p");
      last.className = "admin-entry__meta";
      last.textContent = `Last activity: ${formatDateTime(developer.last_activity)}`;
      entry.appendChild(last);
    }
  }

  return entry;
}

function createBadge(label: string, variant: "success" | "warning" | "critical" | "default"): HTMLElement {
  const badge = document.createElement("span");
  badge.className = "admin-badge";
  if (variant === "success") {
    badge.classList.add("admin-badge--success");
  } else if (variant === "warning") {
    badge.classList.add("admin-badge--warning");
  } else if (variant === "critical") {
    badge.classList.add("admin-badge--critical");
  }
  badge.textContent = label;
  return badge;
}

function buildEmptyState(icon: string, title: string, description?: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-empty";

  const iconEl = document.createElement("div");
  iconEl.className = "admin-empty__icon";
  iconEl.textContent = icon;

  const titleEl = document.createElement("p");
  titleEl.textContent = title;

  wrapper.append(iconEl, titleEl);

  if (description) {
    const descriptionEl = document.createElement("span");
    descriptionEl.textContent = description;
    wrapper.appendChild(descriptionEl);
  }

  return wrapper;
}

function buildLoadingState(message: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-empty";
  const text = document.createElement("p");
  text.textContent = message;
  wrapper.appendChild(text);
  return wrapper;
}
