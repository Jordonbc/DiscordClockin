import { state } from "../state.js";
import {
  dashboardActivity,
  dashboardBreakHours,
  dashboardClockMessage,
  dashboardClockStatus,
  dashboardDailyHours,
  dashboardWeeklyHours,
  dashboardGreeting,
  dashboardPayrollNote,
  dashboardPayrollRate,
  dashboardPayrollTotal,
  dashboardPayrollWeekly,
  dashboardSubtitle,
  hoursReportAverage,
  hoursReportBreak,
  hoursReportDailyList,
  hoursReportExportButton,
  hoursReportRangeButtons,
  hoursReportRangeLabel,
  hoursReportRangeType,
  hoursReportRecentList,
  hoursReportSessions,
  hoursReportTotal,
  hoursReportDatePicker,
  timeClockActionButton,
  timeClockDate,
  timeClockDisplay,
  timeClockMessage,
  timeClockSessionsList,
  timeClockStatusBadge,
  timeClockSummaryBreak,
  timeClockSummaryOvertime,
  timeClockSummarySessions,
  timeClockSummaryTotal,
} from "../dom.js";
import { getLastClockStatus } from "../clockStatus.js";
import {
  formatCurrency,
  formatDateTime,
  formatDecimalHours,
  formatDuration,
  formatHours,
  formatDateInputValue,
  formatReportRangeLabel,
  formatTimeRange,
  getReportWindow,
  normalizeReportReference,
  filterEntriesByRange,
  buildDailyBreakdown,
} from "../utils/formatters.js";
import { calculateDurationMinutes } from "../utils/time.js";
import { hasActiveSession } from "./clockControls.js";

let timeClockTicker: ReturnType<typeof setInterval> | null = null;

function updateTimeClockTicker(): void {
  if (timeClockDisplay) {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    timeClockDisplay.textContent = new Date().toLocaleTimeString(undefined, timeOptions);
  }
  if (timeClockDate) {
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    timeClockDate.textContent = new Date().toLocaleDateString(undefined, dateOptions);
  }
}

export function startTimeClockTicker(): void {
  updateTimeClockTicker();
  if (timeClockTicker) return;
  timeClockTicker = setInterval(updateTimeClockTicker, 1000);
}

export function renderDashboardOverview(): void {
  const status = getLastClockStatus();

  if (dashboardClockStatus) {
    dashboardClockStatus.textContent = status.label;
    dashboardClockStatus.className = status.className;
  }
  if (dashboardClockMessage) {
    dashboardClockMessage.textContent = status.message;
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
        const metaParts: string[] = [];
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

export function renderTimeClockPage(): void {
  const status = getLastClockStatus();

  if (timeClockStatusBadge) {
    timeClockStatusBadge.textContent = status.label;
    timeClockStatusBadge.className = status.className;
  }

  const authed = Boolean(state.user);
  let message = status.message;
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
    timeClockSummaryBreak.textContent = metrics ? formatHours(metrics.break_hours) : "0h 00m";
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

export function renderHoursReport(): void {
  const range = state.hoursReportRange || "weekly";
  const referenceTime = normalizeReportReference(range, state.hoursReportReference);
  if (state.hoursReportReference !== referenceTime) {
    state.hoursReportReference = referenceTime;
  }

  const currentWindow = getReportWindow(range, referenceTime);
  const weeklyWindow = getReportWindow("weekly", referenceTime);
  const monthlyWindow = getReportWindow("monthly", referenceTime);
  const yearlyWindow = getReportWindow("yearly", referenceTime);
  const { start, end } = currentWindow;
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

  if (hoursReportRangeType) {
    const formattedRange =
      range === "monthly" ? "Monthly" : range === "yearly" ? "Yearly" : "Weekly";
    hoursReportRangeType.textContent = formattedRange;
  }

  if (hoursReportDatePicker) {
    let pickerValue = weeklyWindow.start;
    if (range === "monthly") {
      pickerValue = monthlyWindow.start;
    } else if (range === "yearly") {
      pickerValue = yearlyWindow.start;
    }
    hoursReportDatePicker.value = formatDateInputValue(pickerValue);
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

  if (hoursReportExportButton) {
    hoursReportExportButton.disabled = !authed;
  }
}
