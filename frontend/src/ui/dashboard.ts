import { state } from "../state";
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
  hoursReportCalendarGrid,
  hoursReportMonthSelect,
  hoursReportYearSelect,
  hoursReportRangeLabel,
  hoursReportRangeType,
  hoursReportRecentList,
  hoursReportSessions,
  hoursReportTotal,
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
} from "../dom";
import { getLastClockStatus } from "../clockStatus";
import {
  formatCurrency,
  formatDateTime,
  formatDecimalHours,
  formatDuration,
  formatHours,
  formatReportRangeLabel,
  formatTimeRange,
  filterEntriesByRange,
  buildDailyBreakdown,
} from "../utils/formatters";
import { calculateDurationMinutes } from "../utils/time";
import { hasActiveSession } from "./clockControls";

const DAY_IN_MS = 86400000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const { start, end, daySpan } = normalizeHoursReportRange();
  const authed = Boolean(state.user);
  const metrics = authed ? state.timeMetrics : null;
  const workerError = authed ? state.workerError : null;

  if (hoursReportRangeLabel) {
    const rangeLabel = formatReportRangeLabel(start, end);
    const dayCountLabel = `${daySpan} ${daySpan === 1 ? "day" : "days"}`;
    hoursReportRangeLabel.textContent = `${rangeLabel} • ${dayCountLabel}`;
  }

  if (hoursReportRangeType) {
    hoursReportRangeType.textContent = "Range";
  }

  renderHoursReportCalendar(start, end);

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

function normalizeHoursReportRange(): { start: Date; end: Date; daySpan: number } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const defaultStart = new Date(now);
  defaultStart.setDate(now.getDate() - now.getDay());

  let start =
    typeof state.hoursReportRangeStart === "number"
      ? new Date(state.hoursReportRangeStart)
      : new Date(defaultStart);
  if (Number.isNaN(start.getTime())) {
    start = new Date(defaultStart);
  }
  start.setHours(0, 0, 0, 0);

  let end =
    typeof state.hoursReportRangeEnd === "number"
      ? new Date(state.hoursReportRangeEnd)
      : new Date(start);
  if (Number.isNaN(end.getTime())) {
    end = new Date(start);
  }
  end.setHours(0, 0, 0, 0);

  if (end.getTime() <= start.getTime()) {
    end = new Date(start);
    end.setDate(start.getDate() + 1);
  }

  const startTime = start.getTime();
  const endTime = end.getTime();

  if (state.hoursReportRangeStart !== startTime) {
    state.hoursReportRangeStart = startTime;
  }
  if (state.hoursReportRangeEnd !== endTime) {
    state.hoursReportRangeEnd = endTime;
  }

  const daySpan = Math.max(1, Math.round((endTime - startTime) / DAY_IN_MS));

  return { start, end, daySpan };
}

function ensureCalendarMonth(start: Date): Date {
  const fallback = new Date(start);
  fallback.setDate(1);
  fallback.setHours(0, 0, 0, 0);

  const month =
    typeof state.hoursReportCalendarMonth === "number"
      ? new Date(state.hoursReportCalendarMonth)
      : new Date(fallback);

  if (Number.isNaN(month.getTime())) {
    month.setTime(fallback.getTime());
  }

  month.setHours(0, 0, 0, 0);
  month.setDate(1);

  const monthTime = month.getTime();
  if (state.hoursReportCalendarMonth !== monthTime) {
    state.hoursReportCalendarMonth = monthTime;
  }

  return month;
}

function renderHoursReportCalendar(start: Date, end: Date): void {
  if (!hoursReportCalendarGrid) return;

  const calendarMonth = ensureCalendarMonth(start);

  if (hoursReportMonthSelect) {
    if (!hoursReportMonthSelect.options.length) {
      const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long" });
      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const option = document.createElement("option");
        option.value = String(monthIndex);
        option.textContent = monthFormatter.format(new Date(2000, monthIndex, 1));
        hoursReportMonthSelect.append(option);
      }
    }
    hoursReportMonthSelect.value = String(calendarMonth.getMonth());
  }

  if (hoursReportYearSelect) {
    const today = new Date();
    const entries = state.userEntries;
    let minYear = today.getFullYear() - 5;
    let maxYear = today.getFullYear() + 5;

    if (typeof state.hoursReportRangeStart === "number") {
      minYear = Math.min(minYear, new Date(state.hoursReportRangeStart).getFullYear());
      maxYear = Math.max(maxYear, new Date(state.hoursReportRangeStart).getFullYear());
    }
    if (typeof state.hoursReportRangeEnd === "number") {
      minYear = Math.min(minYear, new Date(state.hoursReportRangeEnd).getFullYear());
      maxYear = Math.max(maxYear, new Date(state.hoursReportRangeEnd).getFullYear());
    }

    entries.forEach((entry) => {
      const times = [entry.start, entry.end].filter(Boolean);
      times.forEach((value) => {
        const date = new Date(value as string | number);
        if (Number.isNaN(date.getTime())) return;
        const year = date.getFullYear();
        minYear = Math.min(minYear, year);
        maxYear = Math.max(maxYear, year);
      });
    });

    const currentYear = calendarMonth.getFullYear();
    minYear = Math.min(minYear, currentYear);
    maxYear = Math.max(maxYear, currentYear);

    const existingYears = Array.from(hoursReportYearSelect.options).map((option) =>
      Number(option.value)
    );
    const desiredYears: number[] = [];
    for (let year = minYear; year <= maxYear; year += 1) {
      desiredYears.push(year);
    }

    if (
      desiredYears.length !== existingYears.length ||
      desiredYears.some((year, index) => year !== existingYears[index])
    ) {
      hoursReportYearSelect.replaceChildren();
      desiredYears.forEach((year) => {
        const option = document.createElement("option");
        option.value = String(year);
        option.textContent = String(year);
        hoursReportYearSelect.append(option);
      });
    }

    hoursReportYearSelect.value = String(currentYear);
  }

  const monthTime = calendarMonth.getTime();

  const gridStart = new Date(calendarMonth);
  const leadingDays = gridStart.getDay();
  gridStart.setDate(gridStart.getDate() - leadingDays);
  gridStart.setHours(0, 0, 0, 0);

  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 42);

  const selectionStart = start.getTime();
  const selectionEnd = end.getTime();

  if (
    state.hoursReportCalendarFollowSelection &&
    (selectionEnd <= gridStart.getTime() || selectionStart >= gridEnd.getTime())
  ) {
    const newMonth = new Date(start);
    newMonth.setDate(1);
    newMonth.setHours(0, 0, 0, 0);
    const newMonthTime = newMonth.getTime();
    if (newMonthTime !== monthTime) {
      state.hoursReportCalendarMonth = newMonthTime;
      renderHoursReportCalendar(start, end);
      return;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const fragment = document.createDocumentFragment();
  const weekdayRow = document.createElement("div");
  weekdayRow.className = "report-range-picker__weekday-row";
  WEEKDAY_LABELS.forEach((day) => {
    const cell = document.createElement("span");
    cell.textContent = day;
    weekdayRow.appendChild(cell);
  });
  fragment.appendChild(weekdayRow);

  const daysContainer = document.createElement("div");
  daysContainer.className = "report-range-picker__days";

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    date.setHours(0, 0, 0, 0);
    const timestamp = date.getTime();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "report-range-picker__day";
    button.dataset.calendarDate = String(timestamp);
    button.textContent = String(date.getDate());

    if (date.getMonth() !== calendarMonth.getMonth()) {
      button.classList.add("is-outside");
    }

    if (timestamp === todayTime) {
      button.classList.add("is-today");
    }

    const isSelected = timestamp >= selectionStart && timestamp < selectionEnd;
    if (isSelected) {
      button.classList.add("is-selected");
    }

    if (timestamp === selectionStart) {
      button.classList.add("is-range-start");
    }

    if (timestamp === selectionEnd - DAY_IN_MS) {
      button.classList.add("is-range-end");
    }

    button.setAttribute(
      "aria-pressed",
      isSelected ? "true" : "false"
    );
    button.setAttribute(
      "aria-label",
      date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );

    daysContainer.appendChild(button);
  }

  fragment.appendChild(daysContainer);

  hoursReportCalendarGrid.innerHTML = "";
  hoursReportCalendarGrid.appendChild(fragment);
}
