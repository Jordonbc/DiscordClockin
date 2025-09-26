import { query, queryAll } from "./domUtils.js";

export { query, queryAll };

export const navButtons = queryAll<HTMLElement>("[data-view-button]");
export const views = queryAll<HTMLElement>(".view");
export const viewJumpButtons = Array.from(
  document.querySelectorAll<HTMLElement>("[data-view-jump]")
);
export const heroLoginButton = query<HTMLElement>("[data-hero-action='login']");
export const authRequiredModal = query<HTMLElement>("#auth-required-modal");
export const authRequiredLoginButton = query<HTMLButtonElement>("#auth-required-login");
export const appShell = query<HTMLElement>(".app");

export const connectionIndicator = query<HTMLElement>("#connection-indicator");

export const loginButton = query<HTMLButtonElement>("#login-button");
export const userMenu = query<HTMLElement>("#user-menu");
export const userMenuButton = query<HTMLButtonElement>("#user-menu-button");
export const userMenuDropdown = query<HTMLElement>("#user-menu-dropdown");
export const userMenuProfile = query<HTMLElement>("[data-user-menu-action='profile']");
export const userMenuAdmin = query<HTMLElement>("#user-menu-admin");
export const logoutButton = query<HTMLButtonElement>("#logout-button");
export const userName = query<HTMLElement>("#user-name");
export const userRoles = query<HTMLElement>("#user-roles");
export const userAvatar = query<HTMLImageElement>("#user-avatar");

export const clockState = query<HTMLElement>("#clock-state");
export const clockMessage = query<HTMLElement>("#clock-message");
export const clockInButton = query<HTMLButtonElement>("#clock-in");
export const clockOutButton = query<HTMLButtonElement>("#clock-out");
export const clockSummaryInput = query<HTMLTextAreaElement>("#clock-out-summary");
export const refreshMyTimeButton = query<HTMLButtonElement>("#refresh-my-time");
export const myTimeEntries = query<HTMLElement>("#my-time-entries");

export const holidayForm = query<HTMLFormElement>("#holiday-form");
export const refreshHolidaysButton = query<HTMLButtonElement>("#refresh-holidays");
export const holidayList = query<HTMLElement>("#holiday-list");

export const adminTimesheetForm = query<HTMLFormElement>("#admin-timesheet-form");
export const adminTimesheetRows = query<HTMLElement>("#admin-timesheet-rows");
export const refreshAdminTimesheets = query<HTMLButtonElement>("#refresh-admin-timesheets");
export const adminModifyHoursForm = query<HTMLFormElement>("#admin-modify-hours-form");

export const adminHolidayList = query<HTMLElement>("#admin-holiday-requests");
export const refreshAdminHolidays = query<HTMLButtonElement>("#refresh-admin-holidays");
export const adminHolidayForm = query<HTMLFormElement>("#admin-holiday-form");

export const adminRoleForm = query<HTMLFormElement>("#admin-role-form");

export const notifications = query<HTMLElement>("#notifications");

export const dashboardGreeting = query<HTMLElement>("#dashboard-greeting");
export const dashboardSubtitle = query<HTMLElement>("#dashboard-subtitle");
export const dashboardClockStatus = query<HTMLElement>("#dashboard-clock-status");
export const dashboardClockMessage = query<HTMLElement>("#dashboard-clock-message");
export const dashboardDailyHours = query<HTMLElement>("#dashboard-daily-hours");
export const dashboardWeeklyHours = query<HTMLElement>("#dashboard-weekly-hours");
export const dashboardBreakHours = query<HTMLElement>("#dashboard-break-hours");
export const dashboardActivity = query<HTMLElement>("#dashboard-activity");
export const dashboardPayrollRate = query<HTMLElement>("#dashboard-payroll-rate");
export const dashboardPayrollWeekly = query<HTMLElement>("#dashboard-payroll-weekly");
export const dashboardPayrollTotal = query<HTMLElement>("#dashboard-payroll-total");
export const dashboardPayrollNote = query<HTMLElement>("#dashboard-payroll-note");

export const timeClockStatusBadge = query<HTMLElement>("#time-clock-status");
export const timeClockDisplay = query<HTMLElement>("#time-clock-display");
export const timeClockDate = query<HTMLElement>("#time-clock-date");
export const timeClockMessage = query<HTMLElement>("#time-clock-message");
export const timeClockActionButton = query<HTMLButtonElement>("#time-clock-action");
export const timeClockSummaryTotal = query<HTMLElement>("#time-clock-summary-total");
export const timeClockSummarySessions = query<HTMLElement>("#time-clock-summary-sessions");
export const timeClockSummaryBreak = query<HTMLElement>("#time-clock-summary-break");
export const timeClockSummaryOvertime = query<HTMLElement>("#time-clock-summary-overtime");
export const timeClockSessionsList = query<HTMLElement>("#time-clock-sessions");

export const hoursReportRangeLabel = query<HTMLElement>("#hours-report-range");
export const hoursReportTotal = query<HTMLElement>("#hours-report-total");
export const hoursReportBreak = query<HTMLElement>("#hours-report-break");
export const hoursReportSessions = query<HTMLElement>("#hours-report-sessions");
export const hoursReportAverage = query<HTMLElement>("#hours-report-average");
export const hoursReportDailyList = query<HTMLElement>("#hours-report-daily");
export const hoursReportRecentList = query<HTMLElement>("#hours-report-recent");
export const hoursReportExportButton = query<HTMLButtonElement>("#hours-report-export");
export const hoursReportRangeType = query<HTMLElement>("#hours-report-range-type");
export const hoursReportPickerToggle = query<HTMLButtonElement>("#hours-report-picker-toggle");
export const hoursReportPickerPanel = query<HTMLElement>("#hours-report-picker-panel");
export const hoursReportRangePicker = query<HTMLElement>("[data-range-selector]");
export const hoursReportCalendarGrid = query<HTMLElement>("#hours-report-calendar");
export const hoursReportMonthSelect = query<HTMLSelectElement>("#hours-report-month-select");
export const hoursReportYearSelect = query<HTMLSelectElement>("#hours-report-year-select");
export const hoursReportThisWeekButton = query<HTMLButtonElement>("#hours-report-this-week");
export const hoursReportThisMonthButton = query<HTMLButtonElement>("#hours-report-this-month");

export const clockOutModal = query<HTMLElement>("#clockout-modal");
export const clockOutModalForm = query<HTMLFormElement>("#clockout-modal-form");
export const clockOutModalDismissButtons = clockOutModal
  ? Array.from(clockOutModal.querySelectorAll<HTMLButtonElement>("[data-modal-dismiss]"))
  : [];
