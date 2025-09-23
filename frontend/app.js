const config = window.CLOCKIN_FRONTEND_CONFIG || {};
const DEFAULT_DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";
const DISCORD_USER_API_URL = "https://discord.com/api/users/@me";
const DISCORD_STORAGE_KEY = "clockin.discordSession";
const DISCORD_OAUTH_STATE_KEY = "clockin.discordOAuthState";

const state = {
  baseUrl: "",
  guildId: "",
  discordAuthorizeUrl: DEFAULT_DISCORD_AUTHORIZE_URL,
  discordClientId: "",
  discordRedirectUri: "",
  discordScopes: ["identify"],
  adminUserIds: [],
  discordToken: null,
  user: null,
  workerProfile: null,
  activeSession: null,
  timeMetrics: null,
  workerError: null,
  userEntries: [],
  userHolidays: [],
  adminTimesheets: [],
  adminTimesheetWorker: null,
  adminTimesheetMemberId: null,
  adminHolidayRequests: [],
  payroll: null,
  hoursReportRange: "weekly",
};

const navButtons = Array.from(document.querySelectorAll("[data-view-button]"));
const views = Array.from(document.querySelectorAll(".view"));
const viewJumpButtons = document.querySelectorAll("[data-view-jump]");
const heroLoginButton = document.querySelector("[data-hero-action='login']");

const connectionIndicator = document.querySelector("#connection-indicator");

const loginButton = document.querySelector("#login-button");
const userMenu = document.querySelector("#user-menu");
const userMenuButton = document.querySelector("#user-menu-button");
const userMenuDropdown = document.querySelector("#user-menu-dropdown");
const userMenuProfile = document.querySelector("[data-user-menu-action='profile']");
const userMenuAdmin = document.querySelector("#user-menu-admin");
const logoutButton = document.querySelector("#logout-button");
const userName = document.querySelector("#user-name");
const userRoles = document.querySelector("#user-roles");
const userAvatar = document.querySelector("#user-avatar");

const clockState = document.querySelector("#clock-state");
const clockMessage = document.querySelector("#clock-message");
const clockInButton = document.querySelector("#clock-in");
const clockOutButton = document.querySelector("#clock-out");
const clockSummaryInput = document.querySelector("#clock-out-summary");
const refreshMyTimeButton = document.querySelector("#refresh-my-time");
const myTimeEntries = document.querySelector("#my-time-entries");

const holidayForm = document.querySelector("#holiday-form");
const refreshHolidaysButton = document.querySelector("#refresh-holidays");
const holidayList = document.querySelector("#holiday-list");

const adminTimesheetForm = document.querySelector("#admin-timesheet-form");
const adminTimesheetRows = document.querySelector("#admin-timesheet-rows");
const refreshAdminTimesheets = document.querySelector(
  "#refresh-admin-timesheets",
);
const adminModifyHoursForm = document.querySelector(
  "#admin-modify-hours-form",
);

const adminHolidayList = document.querySelector("#admin-holiday-requests");
const refreshAdminHolidays = document.querySelector("#refresh-admin-holidays");
const adminHolidayForm = document.querySelector("#admin-holiday-form");

const adminRoleForm = document.querySelector("#admin-role-form");

const notifications = document.querySelector("#notifications");

const dashboardGreeting = document.querySelector("#dashboard-greeting");
const dashboardSubtitle = document.querySelector("#dashboard-subtitle");
const dashboardClockStatus = document.querySelector("#dashboard-clock-status");
const dashboardClockMessage = document.querySelector("#dashboard-clock-message");
const dashboardDailyHours = document.querySelector("#dashboard-daily-hours");
const dashboardWeeklyHours = document.querySelector("#dashboard-weekly-hours");
const dashboardBreakHours = document.querySelector("#dashboard-break-hours");
const dashboardActivity = document.querySelector("#dashboard-activity");
const dashboardPayrollRate = document.querySelector("#dashboard-payroll-rate");
const dashboardPayrollWeekly = document.querySelector("#dashboard-payroll-weekly");
const dashboardPayrollTotal = document.querySelector("#dashboard-payroll-total");
const dashboardPayrollNote = document.querySelector("#dashboard-payroll-note");

const timeClockStatusBadge = document.querySelector("#time-clock-status");
const timeClockDisplay = document.querySelector("#time-clock-display");
const timeClockDate = document.querySelector("#time-clock-date");
const timeClockMessage = document.querySelector("#time-clock-message");
const timeClockActionButton = document.querySelector("#time-clock-action");
const timeClockSummaryTotal = document.querySelector("#time-clock-summary-total");
const timeClockSummarySessions = document.querySelector("#time-clock-summary-sessions");
const timeClockSummaryBreak = document.querySelector("#time-clock-summary-break");
const timeClockSummaryOvertime = document.querySelector("#time-clock-summary-overtime");
const timeClockSessionsList = document.querySelector("#time-clock-sessions");

const hoursReportRangeButtons = Array.from(
  document.querySelectorAll("[data-report-range]"),
);
const hoursReportRangeLabel = document.querySelector("#hours-report-range");
const hoursReportTotal = document.querySelector("#hours-report-total");
const hoursReportBreak = document.querySelector("#hours-report-break");
const hoursReportSessions = document.querySelector("#hours-report-sessions");
const hoursReportAverage = document.querySelector("#hours-report-average");
const hoursReportDailyList = document.querySelector("#hours-report-daily");
const hoursReportRecentList = document.querySelector("#hours-report-recent");
const hoursReportExportButton = document.querySelector("#hours-report-export");


const clockOutModal = document.querySelector("#clockout-modal");
const clockOutModalForm = document.querySelector("#clockout-modal-form");
const clockOutModalDismissButtons = clockOutModal
  ? Array.from(clockOutModal.querySelectorAll("[data-modal-dismiss]"))
  : [];

let eventSource = null;
let eventStreamReconnectTimer = null;
let userMenuIsOpen = false;
let lastClockStatus = {
  label: "Waiting",
  className: "status-pill status-pill--idle",
  message: "Sign in to manage your shift.",
};
let timeClockTicker = null;

function setUserMenuOpen(open) {
  userMenuIsOpen = Boolean(open);
  if (userMenu) {
    userMenu.classList.toggle("user-menu--open", userMenuIsOpen);
  }
  if (userMenuButton) {
    userMenuButton.setAttribute("aria-expanded", userMenuIsOpen ? "true" : "false");
  }
}

function closeUserMenu() {
  setUserMenuOpen(false);
}

function toggleUserMenu() {
  setUserMenuOpen(!userMenuIsOpen);
}

function hasActiveSession() {
  if (!state.user) return false;
  if (state.activeSession) return true;
  return state.userEntries.some((entry) => !entry.end);
}

function updateClockControlsVisibility() {
  const authed = Boolean(state.user);
  const active = authed && hasActiveSession();

  if (clockOutButton) {
    clockOutButton.hidden = !active;
    clockOutButton.disabled = !active;
  }

  if (clockSummaryInput) {
    clockSummaryInput.disabled = !active;
    if (!active) {
      clockSummaryInput.value = "";
    }
  }

  if (!active) {
    closeClockOutModal();
  }
}

function handleClockOutModalKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeClockOutModal();
  }
}

function openClockOutModal() {
  if (!clockOutModal) return;
  clockOutModal.hidden = false;
  if (document.body) {
    document.body.classList.add("modal-open");
  }
  document.addEventListener("keydown", handleClockOutModalKeydown);
  if (clockSummaryInput) {
    clockSummaryInput.disabled = false;
    clockSummaryInput.focus();
  }
}

function closeClockOutModal() {
  if (!clockOutModal || clockOutModal.hidden) return;
  clockOutModal.hidden = true;
  if (document.body) {
    document.body.classList.remove("modal-open");
  }
  document.removeEventListener("keydown", handleClockOutModalKeydown);
  if (clockSummaryInput) {
    clockSummaryInput.blur();
    if (!hasActiveSession()) {
      clockSummaryInput.value = "";
      clockSummaryInput.disabled = true;
    }
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(start, end) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) return "—";
  const endTime = endDate && !Number.isNaN(endDate.getTime()) ? endDate : new Date();
  const diff = Math.max(0, endTime.getTime() - startDate.getTime());
  const totalMinutes = Math.round(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatHours(hours) {
  if (typeof hours !== "number" || Number.isNaN(hours)) {
    return "0h 00m";
  }
  const totalMinutes = Math.round(hours * 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = Math.abs(totalMinutes % 60);
  return `${totalHours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return `$${value.toFixed(2)}`;
  }
}

function formatDecimalHours(hours) {
  if (typeof hours !== "number" || Number.isNaN(hours)) {
    return "0.0h";
  }
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded.toFixed(1)}h`;
}

function formatTimeRange(start, end) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const options = { hour: "numeric", minute: "2-digit" };
  const startText =
    startDate && !Number.isNaN(startDate.getTime())
      ? startDate.toLocaleTimeString(undefined, options)
      : "—";
  const endText =
    endDate && !Number.isNaN(endDate.getTime())
      ? endDate.toLocaleTimeString(undefined, options)
      : "Now";
  return `${startText} – ${endText}`;
}

function calculateDurationMinutes(start, end) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) return 0;
  const endTime = endDate && !Number.isNaN(endDate.getTime()) ? endDate : new Date();
  const diff = Math.max(0, endTime.getTime() - startDate.getTime());
  return diff / 60000;
}

function getReportWindow(range) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let end;

  switch (range) {
    case "monthly": {
      start.setDate(1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      break;
    }
    case "yearly": {
      start.setMonth(0, 1);
      end = new Date(start.getFullYear() + 1, 0, 1);
      break;
    }
    case "weekly":
    default: {
      const weekday = start.getDay();
      start.setDate(start.getDate() - weekday);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      break;
    }
  }

  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function formatReportRangeLabel(start, end) {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return "—";
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) return "—";

  const inclusiveEnd = new Date(end.getTime() - 1);
  const startOptions = { month: "short", day: "numeric" };
  const endOptions = { month: "short", day: "numeric", year: "numeric" };

  if (start.getFullYear() !== inclusiveEnd.getFullYear()) {
    startOptions.year = "numeric";
  }

  const startText = start.toLocaleDateString(undefined, startOptions);
  const endText = inclusiveEnd.toLocaleDateString(undefined, endOptions);
  return `${startText} – ${endText}`;
}

function filterEntriesByRange(entries, start, end) {
  if (!Array.isArray(entries)) return [];
  const startTime = start instanceof Date ? start.getTime() : 0;
  const endTime = end instanceof Date ? end.getTime() : 0;

  return entries.filter((entry) => {
    if (!entry || !entry.start) return false;
    const entryDate = new Date(entry.start);
    if (Number.isNaN(entryDate.getTime())) return false;
    const timestamp = entryDate.getTime();
    return timestamp >= startTime && timestamp < endTime;
  });
}

function buildDailyBreakdown(entries, start, end) {
  const buckets = [];
  const startTime = start instanceof Date ? start.getTime() : Date.now();
  const endTime = end instanceof Date ? end.getTime() : startTime;
  const totalDays = Math.max(1, Math.round((endTime - startTime) / 86400000));
  const daysToRender = Math.min(7, totalDays);
  const offset = Math.max(0, totalDays - daysToRender);

  for (let index = 0; index < daysToRender; index += 1) {
    const dayStart = new Date(startTime + (offset + index) * 86400000);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    let minutes = 0;
    let sessionCount = 0;

    entries.forEach((entry) => {
      if (!entry || !entry.start) return;
      const entryDate = new Date(entry.start);
      if (Number.isNaN(entryDate.getTime())) return;
      const timestamp = entryDate.getTime();
      if (timestamp >= dayStart.getTime() && timestamp < dayEnd.getTime()) {
        const duration =
          typeof entry.durationMinutes === "number"
            ? entry.durationMinutes
            : calculateDurationMinutes(entry.start, entry.end);
        minutes += Number.isFinite(duration) ? duration : 0;
        sessionCount += 1;
      }
    });

    buckets.push({ date: dayStart, minutes, sessions: sessionCount });
  }

  return buckets;
}

function updateTimeClockTicker() {
  if (timeClockDisplay) {
    timeClockDisplay.textContent = new Date().toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  if (timeClockDate) {
    timeClockDate.textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
}

function startTimeClockTicker() {
  updateTimeClockTicker();
  if (timeClockTicker) return;
  timeClockTicker = setInterval(updateTimeClockTicker, 1000);
}

function renderDashboardOverview() {
  if (dashboardClockStatus) {
    dashboardClockStatus.textContent = lastClockStatus.label;
    dashboardClockStatus.className = lastClockStatus.className;
  }
  if (dashboardClockMessage) {
    dashboardClockMessage.textContent = lastClockStatus.message;
  }

  const authed = Boolean(state.user);
  const displayName = state.user?.displayName || state.user?.username || "there";

  if (dashboardGreeting) {
    dashboardGreeting.textContent = authed
      ? `Welcome back, ${displayName}!`
      : "Welcome to the ClockIn portal";
  }

  if (dashboardSubtitle) {
    dashboardSubtitle.textContent = authed
      ? "Here's your time overview for today."
      : "Track your day, request time off, and keep your team informed – all in one place.";
  }

  const metrics = authed ? state.timeMetrics : null;
  if (dashboardDailyHours) {
    dashboardDailyHours.textContent = metrics ? formatHours(metrics.daily_hours) : "0h 00m";
  }
  if (dashboardWeeklyHours) {
    dashboardWeeklyHours.textContent = metrics ? formatHours(metrics.weekly_hours) : "0h 00m";
  }
  if (dashboardBreakHours) {
    dashboardBreakHours.textContent = metrics ? formatHours(metrics.break_hours) : "0h 00m";
  }

  if (dashboardActivity) {
    dashboardActivity.innerHTML = "";
    if (!authed) {
      const item = document.createElement("li");
      item.className = "activity-list__empty muted";
      item.textContent = "Sign in to see your latest updates.";
      dashboardActivity.appendChild(item);
    } else if (state.workerError) {
      const item = document.createElement("li");
      item.className = "activity-list__empty muted";
      item.textContent = state.workerError;
      dashboardActivity.appendChild(item);
    } else if (!state.userEntries.length) {
      const item = document.createElement("li");
      item.className = "activity-list__empty muted";
      item.textContent = "No shifts recorded yet.";
      dashboardActivity.appendChild(item);
    } else {
      state.userEntries.slice(0, 4).forEach((entry) => {
        const statusText = entry.status || (entry.end ? "Completed" : "Active");
        const normalizedStatus = statusText.toLowerCase();
        let statusClass = "status-pill status-pill--idle";
        if (normalizedStatus.includes("complete") || normalizedStatus.includes("active")) {
          statusClass = "status-pill status-pill--success";
        } else if (
          normalizedStatus.includes("denied") ||
          normalizedStatus.includes("error") ||
          normalizedStatus.includes("missed")
        ) {
          statusClass = "status-pill status-pill--error";
        }

        const item = document.createElement("li");
        item.className = "activity-list__item";

        const top = document.createElement("div");
        top.className = "activity-list__top";

        const title = document.createElement("p");
        title.className = "activity-list__title";
        title.textContent = entry.summary || (entry.end ? "Shift completed" : "Shift in progress");

        const statusPill = document.createElement("span");
        statusPill.className = `${statusClass} activity-list__status`;
        statusPill.textContent = statusText;

        top.append(title, statusPill);

        const meta = document.createElement("p");
        meta.className = "activity-list__meta";
        const metaParts = [];
        if (entry.start) {
          metaParts.push(formatDateTime(entry.start));
        }
        const duration = formatDuration(entry.start, entry.end);
        if (duration && duration !== "—") {
          metaParts.push(duration);
        }
        meta.textContent = metaParts.join(" • ");

        item.append(top, meta);
        dashboardActivity.appendChild(item);
      });
    }
  }

  const payroll = authed ? state.payroll : null;
  const hasPayroll =
    payroll && typeof payroll.hourly_rate === "number" && !Number.isNaN(payroll.hourly_rate);

  if (dashboardPayrollRate) {
    dashboardPayrollRate.textContent = hasPayroll
      ? formatCurrency(payroll.hourly_rate) || `${payroll.hourly_rate.toFixed(2)}`
      : "—";
  }
  if (dashboardPayrollWeekly) {
    dashboardPayrollWeekly.textContent = hasPayroll && typeof payroll.projected_weekly_pay === "number"
      ? formatCurrency(payroll.projected_weekly_pay) || `${payroll.projected_weekly_pay.toFixed(2)}`
      : "—";
  }
  if (dashboardPayrollTotal) {
    dashboardPayrollTotal.textContent = hasPayroll && typeof payroll.projected_total_pay === "number"
      ? formatCurrency(payroll.projected_total_pay) || `${payroll.projected_total_pay.toFixed(2)}`
      : "—";
  }
  if (dashboardPayrollNote) {
    dashboardPayrollNote.textContent = hasPayroll
      ? "Values update automatically with your timesheet."
      : "Add your hourly rate in Discord to calculate payroll estimates.";
  }
}

function renderTimeClockPage() {
  if (!timeClockMessage && !timeClockStatusBadge && !timeClockSummaryTotal) {
    return;
  }

  if (timeClockStatusBadge) {
    timeClockStatusBadge.textContent = lastClockStatus.label;
    timeClockStatusBadge.className = lastClockStatus.className;
  }

  const authed = Boolean(state.user);
  let message = lastClockStatus.message;
  if (!authed) {
    message = "Sign in to start tracking your hours.";
  } else if (state.workerError) {
    message = state.workerError;
  }

  if (timeClockMessage) {
    timeClockMessage.textContent = message;
  }

  if (timeClockActionButton) {
    timeClockActionButton.hidden = false;
    timeClockActionButton.disabled = false;
    timeClockActionButton.dataset.action = "";

    if (!authed) {
      timeClockActionButton.textContent = "Login with Discord";
      timeClockActionButton.dataset.action = "login";
    } else if (state.workerError) {
      timeClockActionButton.textContent = "Contact an admin";
      timeClockActionButton.disabled = true;
    } else if (hasActiveSession()) {
      timeClockActionButton.textContent = "Clock out";
      timeClockActionButton.dataset.action = "clock-out";
    } else {
      timeClockActionButton.textContent = "Clock in";
      timeClockActionButton.dataset.action = "clock-in";
    }
  }

  const metrics = authed ? state.timeMetrics : null;
  if (timeClockSummaryTotal) {
    const totalHours = metrics ? formatDecimalHours(metrics.daily_hours) : "0.0h";
    timeClockSummaryTotal.textContent = `${totalHours} total working hours`;
  }

  if (timeClockSummaryBreak) {
    timeClockSummaryBreak.textContent = metrics
      ? formatHours(metrics.break_hours)
      : "0h 00m";
  }

  if (timeClockSummaryOvertime) {
    const overtime = metrics && typeof metrics.overtime_hours === "number"
      ? metrics.overtime_hours
      : 0;
    timeClockSummaryOvertime.textContent = formatHours(overtime);
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const todaysEntries = authed
    ? state.userEntries.filter((entry) => {
        if (!entry.start) return false;
        const startDate = new Date(entry.start);
        if (Number.isNaN(startDate.getTime())) return false;
        return startDate >= startOfDay && startDate < endOfDay;
      })
    : [];

  if (timeClockSummarySessions) {
    timeClockSummarySessions.textContent = authed
      ? String(todaysEntries.length)
      : "0";
  }

  if (timeClockSessionsList) {
    timeClockSessionsList.innerHTML = "";
    if (!authed) {
      const item = document.createElement("li");
      item.className = "muted";
      item.textContent = "Sign in to view today's sessions.";
      timeClockSessionsList.appendChild(item);
    } else if (state.workerError) {
      const item = document.createElement("li");
      item.className = "muted";
      item.textContent = state.workerError;
      timeClockSessionsList.appendChild(item);
    } else if (!todaysEntries.length) {
      const item = document.createElement("li");
      item.className = "muted";
      item.textContent = "No time entries for today yet.";
      timeClockSessionsList.appendChild(item);
    } else {
      todaysEntries.slice(0, 5).forEach((entry) => {
        const listItem = document.createElement("li");
        listItem.className = "time-clock-session";

        const times = document.createElement("p");
        times.className = "time-clock-session__times";
        times.textContent = formatTimeRange(entry.start, entry.end);

        const meta = document.createElement("p");
        meta.className = "time-clock-session__meta";
        const durationText = formatDuration(entry.start, entry.end);
        const statusText = entry.status || (entry.end ? "Completed" : "Active");
        meta.textContent = `${durationText} • ${statusText}`;

        listItem.append(times, meta);
        timeClockSessionsList.appendChild(listItem);
      });
    }
  }
}

function renderHoursReport() {
  const range = state.hoursReportRange || "weekly";
  const { start, end } = getReportWindow(range);
  const authed = Boolean(state.user);
  const metrics = authed ? state.timeMetrics : null;
  const workerError = authed ? state.workerError : null;

  hoursReportRangeButtons.forEach((button) => {
    const isActive = button.dataset.reportRange === range;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (hoursReportRangeLabel) {
    hoursReportRangeLabel.textContent = formatReportRangeLabel(start, end);
  }

  const defaultSummary = {
    totalHours: "0.0h",
    breakHours: "0.0h",
    sessionCount: "0",
    averageHours: "0.0h",
  };

  const filteredEntries = authed
    ? filterEntriesByRange(state.userEntries, start, end)
    : [];
  const totalMinutes = filteredEntries.reduce((sum, entry) => {
    const duration =
      typeof entry.durationMinutes === "number"
        ? entry.durationMinutes
        : calculateDurationMinutes(entry.start, entry.end);
    return sum + (Number.isFinite(duration) ? duration : 0);
  }, 0);
  const totalHours = totalMinutes / 60;
  const sessionsCount = filteredEntries.length;
  const daySpan = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const averageHours = totalHours / Math.max(1, daySpan);
  const breakHours = metrics && typeof metrics.break_hours === "number" ? metrics.break_hours : 0;

  if (hoursReportTotal) {
    hoursReportTotal.textContent = authed ? formatDecimalHours(totalHours) : defaultSummary.totalHours;
  }
  if (hoursReportBreak) {
    hoursReportBreak.textContent = authed
      ? formatDecimalHours(breakHours)
      : defaultSummary.breakHours;
  }
  if (hoursReportSessions) {
    hoursReportSessions.textContent = authed ? String(sessionsCount) : defaultSummary.sessionCount;
  }
  if (hoursReportAverage) {
    hoursReportAverage.textContent = authed
      ? formatDecimalHours(averageHours)
      : defaultSummary.averageHours;
  }

  if (hoursReportDailyList) {
    hoursReportDailyList.innerHTML = "";

    if (!authed) {
      const item = document.createElement("li");
      item.className = "report-breakdown__empty muted";
      item.textContent = "Sign in to view your tracked hours.";
      hoursReportDailyList.appendChild(item);
    } else if (workerError) {
      const item = document.createElement("li");
      item.className = "report-breakdown__empty muted";
      item.textContent = workerError;
      hoursReportDailyList.appendChild(item);
    } else {
      const breakdown = buildDailyBreakdown(filteredEntries, start, end);
      breakdown.forEach((bucket) => {
        const item = document.createElement("li");
        item.className = "report-breakdown__item";

        const info = document.createElement("div");
        info.className = "report-breakdown__info";

        const day = document.createElement("p");
        day.className = "report-breakdown__day";
        day.textContent = bucket.date.toLocaleDateString(undefined, {
          weekday: "long",
        });

        const date = document.createElement("p");
        date.className = "report-breakdown__date";
        date.textContent = bucket.date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });

        info.append(day, date);

        const meta = document.createElement("div");
        meta.className = "report-breakdown__meta";

        const hours = document.createElement("span");
        hours.className = "report-breakdown__hours";
        hours.textContent = formatDecimalHours(bucket.minutes / 60);

        const sessions = document.createElement("span");
        sessions.className = "report-breakdown__sessions";
        sessions.textContent = `${bucket.sessions} ${bucket.sessions === 1 ? "session" : "sessions"}`;

        meta.append(hours, sessions);
        item.append(info, meta);
        hoursReportDailyList.appendChild(item);
      });
    }
  }

  if (hoursReportRecentList) {
    hoursReportRecentList.innerHTML = "";

    if (!authed) {
      const item = document.createElement("li");
      item.className = "report-session-list__empty muted";
      item.textContent = "Sign in to load your recent sessions.";
      hoursReportRecentList.appendChild(item);
    } else if (workerError) {
      const item = document.createElement("li");
      item.className = "report-session-list__empty muted";
      item.textContent = workerError;
      hoursReportRecentList.appendChild(item);
    } else if (!filteredEntries.length) {
      const item = document.createElement("li");
      item.className = "report-session-list__empty muted";
      item.textContent = "No sessions recorded for this period yet.";
      hoursReportRecentList.appendChild(item);
    } else {
      filteredEntries
        .slice()
        .sort((a, b) => {
          const aTime = a.start ? new Date(a.start).getTime() : 0;
          const bTime = b.start ? new Date(b.start).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 6)
        .forEach((entry) => {
          const item = document.createElement("li");
          item.className = "report-session";

          const header = document.createElement("div");
          header.className = "report-session__header";

          const date = document.createElement("p");
          date.className = "report-session__date";
          date.textContent = formatDateTime(entry.start);

          const duration = document.createElement("span");
          duration.className = "report-session__duration";
          duration.textContent = formatDuration(entry.start, entry.end);

          header.append(date, duration);

          const meta = document.createElement("p");
          meta.className = "report-session__meta";
          meta.textContent = `${formatTimeRange(entry.start, entry.end)} • ${
            entry.status || (entry.end ? "Completed" : "Active")
          }`;

          item.append(header, meta);

          if (entry.summary) {
            const summary = document.createElement("p");
            summary.className = "report-session__summary";
            summary.textContent = entry.summary;
            item.append(summary);
          }

          hoursReportRecentList.appendChild(item);
        });
    }
  }
}

function showToast(message, type = "info") {
  if (!notifications) return;
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  notifications.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add("toast--visible");
  });
  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 250);
  }, 4500);
}

function disconnectEventStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (eventStreamReconnectTimer) {
    clearTimeout(eventStreamReconnectTimer);
    eventStreamReconnectTimer = null;
  }
}

function scheduleEventStreamReconnect(delayMs = 5000) {
  if (eventStreamReconnectTimer) {
    return;
  }
  eventStreamReconnectTimer = setTimeout(() => {
    eventStreamReconnectTimer = null;
    connectEventStream();
  }, Math.max(1000, delayMs));
}

function connectEventStream() {
  if (typeof EventSource === "undefined") {
    return;
  }

  if (!state.baseUrl || !state.guildId) {
    disconnectEventStream();
    return;
  }

  const url = new URL("events/stream", state.baseUrl);
  url.searchParams.set("guild_id", state.guildId);
  url.searchParams.set("event", "clock_in,clock_out");

  disconnectEventStream();

  eventSource = new EventSource(url.toString());
  eventSource.onmessage = (event) => {
    if (!event?.data) return;
    try {
      const payload = JSON.parse(event.data);
      handleHookEvent(payload);
    } catch (error) {
      console.warn("Failed to parse hook event payload", error);
    }
  };
  eventSource.onerror = () => {
    disconnectEventStream();
    scheduleEventStreamReconnect();
  };
}

function handleHookEvent(event) {
  if (!event || typeof event !== "object") return;
  if (event.guild_id && state.guildId && event.guild_id !== state.guildId) {
    return;
  }

  if (event.source === "web_app") {
    return;
  }

  const isSelf = state.user && event.user_id === state.user.id;
  if (!isSelf) {
    return;
  }

  refreshMyTime().catch(() => {});
}

function updateConnectionIndicator(status) {
  if (!connectionIndicator) return;
  const message = status.ok ? "" : status.message || "Offline";
  connectionIndicator.textContent = message;
  if (status.ok) {
    connectionIndicator.title = state.baseUrl
      ? `Connected to configured backend`
      : "Connected";
  } else {
    connectionIndicator.title = message;
  }
  connectionIndicator.classList.toggle(
    "status-pill--success",
    Boolean(status.ok),
  );
  connectionIndicator.classList.toggle(
    "status-pill--error",
    !status.ok,
  );
  connectionIndicator.classList.toggle("status-pill--idle", false);
}

function normalizeBaseUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch (error) {
    throw new Error("Invalid backend URL");
  }

  let { pathname } = parsed;
  const hasVersion = /\/api\/v\d+(?:\/|$)/i.test(pathname);
  const endsWithApi = /\/api\/?$/i.test(pathname);
  const isRoot = pathname === "/" || pathname === "";

  if (hasVersion) {
    if (!pathname.endsWith("/")) {
      pathname = `${pathname}/`;
    }
  } else if (isRoot) {
    pathname = "/api/v1/";
  } else if (endsWithApi) {
    pathname = pathname.replace(/\/api\/?$/i, "/api/v1/");
  } else if (!pathname.endsWith("/")) {
    pathname = `${pathname}/`;
  }

  parsed.pathname = pathname;
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString();
}

function configureBaseUrl() {
  const configured =
    config && typeof config.apiBaseUrl === "string"
      ? config.apiBaseUrl.trim()
      : "";

  if (!configured) {
    state.baseUrl = "";
    updateConnectionIndicator({
      ok: false,
      message: "Backend not configured",
    });
    return;
  }

  try {
    state.baseUrl = normalizeBaseUrl(configured);
    updateConnectionIndicator({ ok: true });
  } catch (error) {
    state.baseUrl = "";
    const message = error instanceof Error ? error.message : "Invalid backend URL";
    updateConnectionIndicator({ ok: false, message });
    showToast(message, "error");
  }
}

function configureGuild() {
  const guildId =
    config && typeof config.guildId === "string" ? config.guildId.trim() : "";

  state.guildId = guildId;

  if (!guildId) {
    console.warn("Guild ID is not configured; backend requests require a guild context.");
  }
}

function configureDiscordLogin() {
  const clientId =
    config && typeof config.discordClientId === "string"
      ? config.discordClientId.trim()
      : "";

  if (!clientId) {
    console.warn("Discord login is not configured; missing client ID.");
  }

  state.discordClientId = clientId;

  const redirectUri =
    config && typeof config.discordRedirectUri === "string"
      ? config.discordRedirectUri.trim()
      : "";

  const { origin, pathname, search } = window.location;
  state.discordRedirectUri = redirectUri || `${origin}${pathname}${search}`;

  const authorizeUrl =
    config && typeof config.discordAuthorizeUrl === "string"
      ? config.discordAuthorizeUrl.trim()
      : "";
  state.discordAuthorizeUrl = authorizeUrl || DEFAULT_DISCORD_AUTHORIZE_URL;

  const scopes = Array.isArray(config.discordScopes)
    ? config.discordScopes
        .map((scope) => (typeof scope === "string" ? scope.trim() : ""))
        .filter(Boolean)
    : [];
  state.discordScopes = scopes.length ? scopes : ["identify"];

  state.adminUserIds = Array.isArray(config.adminUserIds)
    ? config.adminUserIds
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean)
    : [];
}

function generateOAuthStateToken(length = 16) {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

function storeOAuthState(value) {
  try {
    window.sessionStorage.setItem(DISCORD_OAUTH_STATE_KEY, value);
  } catch (error) {
    console.warn("Unable to persist OAuth state", error);
  }
}

function consumeOAuthState(received) {
  let stored = null;
  try {
    stored = window.sessionStorage.getItem(DISCORD_OAUTH_STATE_KEY);
    window.sessionStorage.removeItem(DISCORD_OAUTH_STATE_KEY);
  } catch (error) {
    console.warn("Unable to read OAuth state", error);
  }

  if (!stored) {
    return true;
  }

  return stored === received;
}

function persistDiscordSession(session) {
  try {
    window.localStorage.setItem(DISCORD_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Unable to persist Discord session", error);
  }
}

function loadPersistedDiscordSession() {
  try {
    const raw = window.localStorage.getItem(DISCORD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.accessToken || !parsed.tokenType) return null;
    if (parsed.expiresAt && Date.now() >= parsed.expiresAt) {
      clearPersistedDiscordSession();
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Unable to load Discord session", error);
    return null;
  }
}

function clearPersistedDiscordSession() {
  try {
    window.localStorage.removeItem(DISCORD_STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to clear Discord session", error);
  }
}

function clearUrlHash() {
  const { pathname, search } = window.location;
  window.history.replaceState(null, document.title, `${pathname}${search}`);
}

function extractTokenFromHash() {
  const { hash } = window.location;
  if (!hash || hash.length <= 1) return null;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  const stateParam = params.get("state");
  const stateValid = consumeOAuthState(stateParam);
  if (!stateValid) {
    showToast("Login verification failed. Please try again.", "error");
    clearUrlHash();
    return null;
  }

  const tokenType = params.get("token_type") || "Bearer";
  const expiresIn = parseInt(params.get("expires_in") || "", 10);
  const scope = params.get("scope");
  const now = Date.now();
  const expiresAt = Number.isFinite(expiresIn)
    ? now + Math.max(0, expiresIn) * 1000
    : now + 3600 * 1000;

  clearUrlHash();

  return {
    accessToken,
    tokenType,
    expiresAt,
    scope,
  };
}

function clearDiscordSession(options = {}) {
  state.discordToken = null;
  state.user = null;
  if (!options.skipStorage) {
    clearPersistedDiscordSession();
  }
}

async function fetchDiscordProfile(token) {
  const response = await fetch(DISCORD_USER_API_URL, {
    headers: {
      Authorization: `${token.tokenType} ${token.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord profile: ${response.status}`);
  }

  return response.json();
}

function resolveAvatarUrl(profile) {
  if (profile.avatar) {
    return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`;
  }

  const discriminator = profile.discriminator ? Number.parseInt(profile.discriminator, 10) : 0;
  const index = Number.isFinite(discriminator) ? discriminator % 5 : 0;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function resolveUserRoles(userId) {
  if (!userId) return [];
  return state.adminUserIds.includes(userId) ? ["admin"] : [];
}

async function hydrateDiscordSession() {
  const fragmentToken = extractTokenFromHash();
  const hadFragment = Boolean(fragmentToken);

  if (fragmentToken) {
    state.discordToken = fragmentToken;
    persistDiscordSession(fragmentToken);
  } else {
    const storedToken = loadPersistedDiscordSession();
    if (storedToken) {
      state.discordToken = storedToken;
    }
  }

  if (!state.discordToken) {
    renderAuthState();
    return;
  }

  if (state.discordToken.expiresAt && Date.now() >= state.discordToken.expiresAt) {
    clearDiscordSession();
    renderAuthState();
    return;
  }

  try {
    const profile = await fetchDiscordProfile(state.discordToken);
    state.user = {
      id: profile.id,
      username: profile.username,
      displayName: profile.global_name || profile.username,
      avatarUrl: resolveAvatarUrl(profile),
      roles: resolveUserRoles(profile.id),
    };
    if (hadFragment) {
      showToast(`Welcome, ${state.user.displayName || state.user.username}!`, "success");
    }
    if (state.baseUrl && state.guildId) {
      await refreshMyTime();
    }
  } catch (error) {
    console.error("Unable to hydrate Discord session", error);
    clearDiscordSession();
    showToast("Discord session expired. Please sign in again.", "error");
  } finally {
    renderAuthState();
  }
}

function requireBaseUrl() {
  if (!state.baseUrl) {
    const message = "Backend connection is not configured.";
    updateConnectionIndicator({ ok: false, message });
    showToast(message, "error");
    throw new Error("Missing base URL");
  }
}

function ensureGuildConfigured() {
  if (!state.guildId) {
    const message = "Guild ID is not configured.";
    showToast(message, "error");
    throw new Error("Missing guild ID");
  }
}

async function apiRequest({
  path,
  method = "GET",
  body,
  expectJson = true,
  silent = false,
}) {
  requireBaseUrl();
  const sanitizedPath = typeof path === "string" ? path.replace(/^\/+/, "") : "";
  const url = new URL(sanitizedPath, state.baseUrl);
  const options = {
    method,
    headers: { Accept: "application/json" },
    credentials: "include",
  };
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type") || "";
    const isJson = expectJson && contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        data && typeof data === "object" && data.message
          ? data.message
          : typeof data === "string"
          ? data
          : "Request failed";
      const error = new Error(message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    updateConnectionIndicator({ ok: true });
    return data;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach the backend";
    if (error && typeof error === "object" && "status" in error) {
      if (error.status === 401) {
        updateConnectionIndicator({ ok: true });
      } else {
        updateConnectionIndicator({ ok: false, message });
      }
      if (!silent && error.status !== 401) {
        showToast(message, "error");
      }
    } else {
      updateConnectionIndicator({ ok: false, message });
      if (!silent) {
        showToast(message, "error");
      }
    }
    throw error;
  }
}

function switchView(target) {
  views.forEach((view) => {
    const shouldDisplay = view.dataset.view === target;
    view.classList.toggle("view--active", shouldDisplay);
  });
  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewButton === target);
  });

  if (target === "my-time") {
    refreshMyTime();
    refreshHolidays();
  } else if (target === "time-clock") {
    refreshMyTime();
  } else if (target === "hours-report") {
    refreshMyTime();
  } else if (target === "admin") {
    loadAdminTimesheets();
    loadAdminHolidays();
  }
}

function canAccessAdmin() {
  return Boolean(state.user && Array.isArray(state.user.roles) && state.user.roles.includes("admin"));
}

function renderAuthState() {
  const authed = Boolean(state.user);

  if (loginButton) loginButton.hidden = authed;
  if (heroLoginButton) heroLoginButton.hidden = authed;

  if (userMenu) {
    userMenu.hidden = !authed;
    if (!authed) {
      closeUserMenu();
    }
  }

  if (logoutButton) {
    logoutButton.hidden = !authed;
  }

  if (userMenuAdmin) {
    userMenuAdmin.hidden = !(authed && canAccessAdmin());
  }

  if (authed) {
    userName.textContent = state.user.displayName || state.user.username || "User";
    const roleDetails = [];
    if (state.workerProfile && state.workerProfile.role_id) {
      roleDetails.push(`Role ID: ${state.workerProfile.role_id}`);
    }
    if (Array.isArray(state.user.roles) && state.user.roles.includes("admin")) {
      roleDetails.push("Admin");
    }
    userRoles.textContent = roleDetails.length
      ? roleDetails.join(" • ")
      : "No role assigned";
    if (state.user.avatarUrl) {
      userAvatar.src = state.user.avatarUrl;
      userAvatar.alt = `${state.user.displayName || "User"} avatar`;
    } else {
      userAvatar.removeAttribute("src");
      userAvatar.alt = "";
    }
    if (userMenuButton) {
      const label = state.user.displayName || state.user.username || "Profile";
      userMenuButton.setAttribute("aria-label", label);
      userMenuButton.setAttribute("title", label);
    }
  } else {
    userName.textContent = "";
    userRoles.textContent = "";
    if (userAvatar) {
      userAvatar.removeAttribute("src");
    }
  }

  updateClockControlsVisibility();

  navButtons.forEach((button) => {
    const requiresAuth = button.dataset.requiresAuth === "true";
    const requiresRole = button.dataset.requiresRole;
    let visible = true;
    if (requiresAuth) {
      visible = authed;
    }
    if (requiresRole) {
      visible = visible && requiresRole === "admin" ? canAccessAdmin() : visible;
    }
    button.hidden = !visible;
  });

  viewJumpButtons.forEach((button) => {
    const requiresAuth = button.dataset.requiresAuth === "true";
    const requiresRole = button.dataset.requiresRole;
    let visible = true;
    if (requiresAuth) {
      visible = authed;
    }
    if (requiresRole) {
      visible = visible && requiresRole === "admin" ? canAccessAdmin() : visible;
    }
    button.hidden = !visible;
  });

  renderHoursReport();

  const activeButton = navButtons.find((button) => button.classList.contains("is-active"));
  if (activeButton && activeButton.hidden) {
    switchView("home");
  }

  updateClockStatus();
  renderDashboardOverview();
}

function renderMyTime() {
  if (!myTimeEntries) return;
  myTimeEntries.innerHTML = "";

  if (state.workerError) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "muted";
    cell.textContent = state.workerError;
    row.appendChild(cell);
    myTimeEntries.appendChild(row);
    renderTimeClockPage();
    return;
  }

  if (!state.userEntries.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "muted";
    cell.textContent = "No shifts to display.";
    row.appendChild(cell);
    myTimeEntries.appendChild(row);
    renderTimeClockPage();
    return;
  }

  state.userEntries.forEach((entry) => {
    const row = document.createElement("tr");

    const startCell = document.createElement("td");
    startCell.textContent = formatDateTime(entry.start);

    const endCell = document.createElement("td");
    endCell.textContent = formatDateTime(entry.end);

    const durationCell = document.createElement("td");
    durationCell.textContent = formatDuration(entry.start, entry.end);

    const statusCell = document.createElement("td");
    statusCell.textContent = entry.status || (entry.end ? "Completed" : "Active");

    row.append(startCell, endCell, durationCell, statusCell);
    myTimeEntries.appendChild(row);
  });

  renderTimeClockPage();
}

function renderHolidayRequests() {
  if (!holidayList) return;
  holidayList.innerHTML = "";

  const item = document.createElement("li");
  item.className = "timeline__item muted";
  item.textContent = "Holiday requests are managed directly in Discord.";
  holidayList.appendChild(item);
}

function resolveClockStatus() {
  if (!state.user) {
    return {
      label: "Waiting",
      className: "status-pill status-pill--idle",
      message: "Sign in to manage your shift.",
    };
  }

  if (!state.guildId) {
    return {
      label: "Unknown",
      className: "status-pill status-pill--error",
      message: "Configure a guild ID to load your status.",
    };
  }

  if (!state.workerProfile) {
    return {
      label: "Unknown",
      className: "status-pill status-pill--error",
      message: state.workerError || "No worker record found. Ask an admin to register you.",
    };
  }

  const workerStatus = String(state.workerProfile.status || "").toLowerCase();
  const activeEntry = state.userEntries.find((entry) => !entry.end);

  if (workerStatus === "work") {
    const startedAt = state.activeSession?.started_at_ms || activeEntry?.start || null;
    return {
      label: "Active",
      className: "status-pill status-pill--success",
      message: startedAt
        ? `Clocked in at ${formatDateTime(startedAt)}.`
        : "You're currently clocked in.",
    };
  }

  if (workerStatus === "break") {
    const startedAt = state.activeSession?.started_at_ms || null;
    return {
      label: "On break",
      className: "status-pill status-pill--idle",
      message: startedAt
        ? `On break since ${formatDateTime(startedAt)}.`
        : "You're currently on break.",
    };
  }

  const latest = state.userEntries[0];
  return {
    label: "Offline",
    className: "status-pill status-pill--idle",
    message: latest?.end
      ? `Last shift ended ${formatDateTime(latest.end)}.`
      : "You're clocked out.",
  };
}

function updateClockStatus() {
  updateClockControlsVisibility();

  const status = resolveClockStatus();
  lastClockStatus = status;

  if (clockState) {
    clockState.textContent = status.label;
    clockState.className = status.className;
  }

  if (clockMessage) {
    clockMessage.textContent = status.message;
  }

  if (dashboardClockStatus) {
    dashboardClockStatus.textContent = status.label;
    dashboardClockStatus.className = status.className;
  }

  if (dashboardClockMessage) {
    dashboardClockMessage.textContent = status.message;
  }

  renderTimeClockPage();
}

function renderAdminTimesheets() {
  if (!adminTimesheetRows) return;
  adminTimesheetRows.innerHTML = "";

  if (!state.adminTimesheetMemberId) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "muted";
    cell.textContent = "Submit a search to view entries.";
    row.appendChild(cell);
    adminTimesheetRows.appendChild(row);
    return;
  }

  if (!state.adminTimesheets.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "muted";
    cell.textContent = "No sessions found for this member.";
    row.appendChild(cell);
    adminTimesheetRows.appendChild(row);
    return;
  }

  state.adminTimesheets.forEach((entry) => {
    const row = document.createElement("tr");

    const memberCell = document.createElement("td");
    memberCell.textContent =
      (state.adminTimesheetWorker && state.adminTimesheetWorker.user_id) ||
      entry.memberId ||
      "Unknown";

    const startCell = document.createElement("td");
    startCell.textContent = formatDateTime(entry.start);

    const endCell = document.createElement("td");
    endCell.textContent = formatDateTime(entry.end);

    const durationCell = document.createElement("td");
    durationCell.textContent = formatDuration(entry.start, entry.end);

    const statusCell = document.createElement("td");
    const currentStatus = state.adminTimesheetWorker?.status;
    statusCell.textContent = entry.status || currentStatus || "—";

    row.append(memberCell, startCell, endCell, durationCell, statusCell);
    adminTimesheetRows.appendChild(row);
  });
}

function renderAdminHolidays() {
  if (!adminHolidayList) return;
  adminHolidayList.innerHTML = "";

  const item = document.createElement("li");
  item.className = "timeline__item muted";
  item.textContent = "Holiday approvals are managed within Discord moderation tools.";
  adminHolidayList.appendChild(item);
}

async function refreshMyTime() {
  if (!state.user) return;
  const previousError = state.workerError;

  if (!state.guildId) {
    state.workerProfile = null;
    state.activeSession = null;
    state.timeMetrics = null;
    state.userEntries = [];
    state.payroll = null;
    state.workerError = "Guild ID is not configured.";
    renderMyTime();
    renderDashboardOverview();
    updateClockStatus();
    return;
  }

  try {
    const path = `timesheets/${encodeURIComponent(state.guildId)}/${encodeURIComponent(
      state.user.id,
    )}`;
    const data = await apiRequest({ path, silent: true });
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    state.userEntries = sessions
      .map((session) => ({
        start: session.started_at_ms ?? null,
        end: session.ended_at_ms ?? null,
        status: session.ended_at_ms ? "Completed" : "Active",
        durationMinutes:
          typeof session.duration_minutes === "number"
            ? session.duration_minutes
            : calculateDurationMinutes(session.started_at_ms, session.ended_at_ms),
        summary:
          typeof session.summary === "string" && session.summary.trim()
            ? session.summary.trim()
            : null,
      }))
      .sort((a, b) => {
        const aTime = a.start ? new Date(a.start).getTime() : 0;
        const bTime = b.start ? new Date(b.start).getTime() : 0;
        return bTime - aTime;
      });
    state.workerProfile = data?.worker || null;
    state.activeSession = data?.active_session || null;
    state.timeMetrics = data?.metrics || null;
    state.payroll = data?.payroll || null;
    state.workerError = null;
  } catch (error) {
    state.workerProfile = null;
    state.activeSession = null;
    state.timeMetrics = null;
    state.userEntries = [];
    state.payroll = null;
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      const missingMessage = "No worker record found. Ask an admin to register you.";
      state.workerError = missingMessage;
      updateConnectionIndicator({ ok: true });
      if (previousError !== missingMessage) {
        showToast(missingMessage, "info");
      }
    } else {
      state.workerError = null;
      // error toast handled in apiRequest unless silent
      if (!error || typeof error !== "object" || error.status !== 404) {
        showToast("Failed to load timesheet.", "error");
      }
    }
  }

  renderMyTime();
  renderDashboardOverview();
  renderHoursReport();
  updateClockStatus();
  if (state.user) {
    renderAuthState();
  }
}

async function refreshHolidays() {
  renderHolidayRequests();
}

async function loadAdminTimesheets(memberId) {
  if (!canAccessAdmin()) return;

  if (typeof memberId === "string") {
    state.adminTimesheetMemberId = memberId.trim() || null;
  }

  if (!state.adminTimesheetMemberId) {
    state.adminTimesheets = [];
    state.adminTimesheetWorker = null;
    renderAdminTimesheets();
    return;
  }

  try {
    ensureGuildConfigured();
  } catch (error) {
    state.adminTimesheets = [];
    state.adminTimesheetWorker = null;
    renderAdminTimesheets();
    return;
  }

  try {
    const path = `timesheets/${encodeURIComponent(state.guildId)}/${encodeURIComponent(
      state.adminTimesheetMemberId,
    )}`;
    const data = await apiRequest({ path, silent: true });
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    state.adminTimesheets = sessions
      .map((session) => ({
        memberId: state.adminTimesheetMemberId,
        start: session.started_at_ms ?? null,
        end: session.ended_at_ms ?? null,
        status: session.ended_at_ms ? "Completed" : "Active",
      }))
      .sort((a, b) => {
        const aTime = a.start ? new Date(a.start).getTime() : 0;
        const bTime = b.start ? new Date(b.start).getTime() : 0;
        return bTime - aTime;
      });
    state.adminTimesheetWorker = data?.worker || null;
  } catch (error) {
    state.adminTimesheets = [];
    state.adminTimesheetWorker = null;
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      showToast("No worker record found for that member.", "info");
    } else {
      showToast("Failed to load member timesheet.", "error");
    }
  }

  renderAdminTimesheets();
}

function loadAdminHolidays() {
  if (!canAccessAdmin()) return;
  renderAdminHolidays();
  showToast("Holiday approvals are handled inside Discord.", "info");
}

function bindEvents() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchView(button.dataset.viewButton);
    });
  });

  viewJumpButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.viewJump;
      if (!target) return;
      if (target !== "home" && !state.user) {
        showToast("Sign in to access this section.", "info");
        return;
      }
      const requiresRole = button.dataset.requiresRole;
      if (requiresRole === "admin" && !canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      switchView(target);
    });
  });

  if (heroLoginButton) {
    heroLoginButton.addEventListener("click", () => {
      if (state.user) {
        switchView("my-time");
      } else {
        initiateLogin();
      }
    });
  }

  if (loginButton) {
    loginButton.addEventListener("click", initiateLogin);
  }

  if (userMenuButton) {
    userMenuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!state.user) return;
      toggleUserMenu();
    });
  }

  if (userMenuDropdown) {
    userMenuDropdown.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  if (userMenuProfile) {
    userMenuProfile.addEventListener("click", () => {
      if (!state.user) {
        closeUserMenu();
        showToast("Sign in to view your profile.", "info");
        return;
      }
      closeUserMenu();
      switchView("my-time");
    });
  }

  if (userMenuAdmin) {
    userMenuAdmin.addEventListener("click", () => {
      closeUserMenu();
      if (!canAccessAdmin()) {
        showToast("Admin access is required.", "info");
        return;
      }
      switchView("admin");
    });
  }

  document.addEventListener("click", (event) => {
    if (!userMenuIsOpen) return;
    if (userMenu && event.target instanceof Node && userMenu.contains(event.target)) {
      return;
    }
    closeUserMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeUserMenu();
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      closeUserMenu();
      clearDiscordSession();
      renderAuthState();
      showToast("Signed out.", "info");
      switchView("home");
    });
  }

  if (clockInButton) {
    clockInButton.addEventListener("click", performClockIn);
  }

  if (clockOutButton) {
    clockOutButton.addEventListener("click", promptClockOut);
  }

  if (clockOutModalForm) {
    clockOutModalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.user) {
        showToast("Sign in before clocking out.", "info");
        closeClockOutModal();
        return;
      }
      try {
        ensureGuildConfigured();
      } catch (error) {
        closeClockOutModal();
        return;
      }
      if (!hasActiveSession()) {
        showToast("No active shift to clock out from.", "info");
        closeClockOutModal();
        return;
      }
      const summary = clockSummaryInput ? clockSummaryInput.value.trim() : "";
      if (!summary) {
        showToast("Add a summary before clocking out.", "info");
        if (clockSummaryInput) {
          clockSummaryInput.focus();
        }
        return;
      }
      try {
        await apiRequest({
          path: "shifts/end",
          method: "POST",
          body: {
            guild_id: state.guildId,
            user_id: state.user.id,
            summary,
            source: "web_app",
          },
        });
        showToast("Clocked out.", "success");
        if (clockSummaryInput) {
          clockSummaryInput.value = "";
        }
        closeClockOutModal();
        await refreshMyTime();
      } catch (error) {
        // handled globally
      }
    });
  }

  if (clockOutModalDismissButtons.length) {
    clockOutModalDismissButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeClockOutModal();
      });
    });
  }

  if (refreshMyTimeButton) {
    refreshMyTimeButton.addEventListener("click", refreshMyTime);
  }

  if (holidayForm) {
    holidayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      showToast("Holiday requests are handled inside Discord.", "info");
    });
  }

  if (refreshHolidaysButton) {
    refreshHolidaysButton.addEventListener("click", refreshHolidays);
  }

  if (adminTimesheetForm) {
    adminTimesheetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      const formData = new FormData(adminTimesheetForm);
      const memberId = (formData.get("memberId") || "").trim();
      if (!memberId) {
        state.adminTimesheetMemberId = null;
        state.adminTimesheets = [];
        state.adminTimesheetWorker = null;
        renderAdminTimesheets();
        showToast("Enter a Discord ID to load a timesheet.", "info");
        return;
      }
      await loadAdminTimesheets(memberId);
    });
  }

  if (refreshAdminTimesheets) {
    refreshAdminTimesheets.addEventListener("click", async () => {
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      await loadAdminTimesheets();
    });
  }

  if (adminModifyHoursForm) {
    adminModifyHoursForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      try {
        ensureGuildConfigured();
      } catch (error) {
        return;
      }
      const formData = new FormData(adminModifyHoursForm);
      const memberId = (formData.get("memberId") || "").trim();
      const hours = Number(formData.get("hours"));
      const scope = (formData.get("scope") || "").toString().toLowerCase();
      const action = (formData.get("action") || "add").toString().toLowerCase();

      if (!memberId) {
        showToast("Provide a member ID.", "error");
        return;
      }

      if (!Number.isFinite(hours) || hours <= 0) {
        showToast("Enter a positive number of hours.", "error");
        return;
      }

      if (!["daily", "weekly", "total"].includes(scope)) {
        showToast("Select a valid scope.", "error");
        return;
      }

      const endpoint = action === "remove" ? "workers/hours/remove" : "workers/hours/add";
      const payload = {
        guild_id: state.guildId,
        user_id: memberId,
        hours,
        scope,
      };
      try {
        await apiRequest({ path: endpoint, method: "POST", body: payload });
        showToast("Hours updated.", "success");
        adminModifyHoursForm.reset();
        if (state.adminTimesheetMemberId === memberId) {
          await loadAdminTimesheets();
        }
        if (state.user && state.user.id === memberId) {
          await refreshMyTime();
        }
      } catch (error) {
        // handled globally
      }
    });
  }

  if (refreshAdminHolidays) {
    refreshAdminHolidays.addEventListener("click", loadAdminHolidays);
  }

  if (adminHolidayForm) {
    adminHolidayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      showToast("Handle holiday approvals from the Discord bot.", "info");
    });
  }

  if (adminRoleForm) {
    adminRoleForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      const formData = new FormData(adminRoleForm);
      try {
        ensureGuildConfigured();
      } catch (error) {
        return;
      }
      const memberId = (formData.get("memberId") || "").trim();
      const roleId = (formData.get("roleId") || "").trim();
      const experience = (formData.get("experience") || "").trim();

      if (!memberId || !roleId) {
        showToast("Provide both a member ID and role ID.", "error");
        return;
      }

      const payload = {
        guild_id: state.guildId,
        user_id: memberId,
        role_id: roleId,
        experience: experience || undefined,
      };
      try {
        await apiRequest({
          path: "workers/change-role",
          method: "POST",
          body: payload,
        });
        showToast("Role updated.", "success");
        adminRoleForm.reset();
        if (state.adminTimesheetMemberId === memberId) {
          await loadAdminTimesheets();
        }
        if (state.user && state.user.id === memberId) {
          await refreshMyTime();
        }
      } catch (error) {
        // handled globally
      }
    });
  }

  if (timeClockActionButton) {
    timeClockActionButton.addEventListener("click", () => {
      if (timeClockActionButton.disabled) return;
      const action = timeClockActionButton.dataset.action;
      if (action === "login") {
        initiateLogin();
      } else if (action === "clock-in") {
        performClockIn();
      } else if (action === "clock-out") {
        promptClockOut();
      }
    });
  }

  hoursReportRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const { reportRange } = button.dataset;
      if (!reportRange || state.hoursReportRange === reportRange) return;
      state.hoursReportRange = reportRange;
      renderHoursReport();
    });
  });

  if (hoursReportExportButton) {
    hoursReportExportButton.addEventListener("click", () => {
      if (!state.user) {
        showToast("Sign in to export your hours.", "info");
        return;
      }
      showToast("CSV export coming soon. Use the admin dashboard for full exports.", "info");
    });
  }
}

async function performClockIn() {
  if (!state.user) {
    showToast("Sign in before clocking in.", "info");
    return;
  }
  try {
    ensureGuildConfigured();
  } catch (error) {
    return;
  }
  try {
    await apiRequest({
      path: "shifts/start",
      method: "POST",
      body: {
        guild_id: state.guildId,
        user_id: state.user.id,
        source: "web_app",
      },
    });
    showToast("Clocked in.", "success");
    await refreshMyTime();
  } catch (error) {
    // handled globally
  }
}

function promptClockOut() {
  if (!state.user) {
    showToast("Sign in before clocking out.", "info");
    return;
  }
  try {
    ensureGuildConfigured();
  } catch (error) {
    return;
  }
  if (!hasActiveSession()) {
    showToast("No active shift to clock out from.", "info");
    return;
  }
  openClockOutModal();
}

function initiateLogin() {
  if (!state.discordClientId) {
    showToast("Discord login is not configured.", "error");
    return;
  }

  const oauthState = generateOAuthStateToken();
  storeOAuthState(oauthState);

  const params = new URLSearchParams({
    client_id: state.discordClientId,
    redirect_uri: state.discordRedirectUri,
    response_type: "token",
    scope: state.discordScopes.join(" "),
    state: oauthState,
    prompt: "consent",
  });

  const authorizeUrl = `${state.discordAuthorizeUrl}?${params.toString()}`;
  window.location.href = authorizeUrl;
}

function initialize() {
  configureBaseUrl();
  configureDiscordLogin();
  configureGuild();
  connectEventStream();
  if (!state.baseUrl) {
    showToast("Backend connection is not configured.", "error");
  }
  startTimeClockTicker();
  bindEvents();
  renderAuthState();
  renderHolidayRequests();

  hydrateDiscordSession().then(() => {
    if (state.user && state.baseUrl && state.guildId) {
      switchView("my-time");
    }
  });
}

initialize();
