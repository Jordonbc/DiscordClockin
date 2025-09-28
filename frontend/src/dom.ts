import { query, queryAll } from "./domUtils";

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

export const profileForm = query<HTMLFormElement>("#profile-form");
export const profileFirstNameInput = query<HTMLInputElement>("#profile-first-name");
export const profileLastNameInput = query<HTMLInputElement>("#profile-last-name");
export const profilePronounsInput = query<HTMLInputElement>("#profile-pronouns");
export const profileTimezoneInput = query<HTMLInputElement>("#profile-timezone");
export const profileLocationInput = query<HTMLInputElement>("#profile-location");
export const profileBioInput = query<HTMLTextAreaElement>("#profile-bio");
export const profileSubmitButton = query<HTMLButtonElement>("#profile-submit");
export const profileResetButton = query<HTMLButtonElement>("#profile-reset");
export const profileStatus = query<HTMLElement>("#profile-status");
export const profileEmptyState = query<HTMLElement>("#profile-empty-state");

export const adminTabButtons = queryAll<HTMLButtonElement>("[data-admin-tab]");
export const adminSections = queryAll<HTMLElement>("[data-admin-section]");
export const adminDepartmentsContainer = query<HTMLElement>("#admin-departments");
export const adminRolesContainer = query<HTMLElement>("#admin-roles");
export const adminDevelopersContainer = query<HTMLElement>("#admin-developers");
export const adminOffboardingContainer = query<HTMLElement>("#admin-offboarding");
export const adminPerformanceMetrics = query<HTMLElement>("#admin-performance-metrics");
export const adminPerformanceDetails = query<HTMLElement>("#admin-performance-details");
export const adminTimeEntriesContainer = query<HTMLElement>("#admin-time-entries");
export const adminHolidayOverview = query<HTMLElement>("#admin-holiday-overview");
export const adminAddDepartmentButton = query<HTMLButtonElement>("#admin-add-department");
export const adminAddRoleButton = query<HTMLButtonElement>("#admin-add-role");
export const adminRefreshDevelopersButton = query<HTMLButtonElement>("#admin-refresh-developers");
export const adminRefreshPerformanceButton = query<HTMLButtonElement>("#admin-refresh-performance");
export const adminAddTimeEntryButton = query<HTMLButtonElement>("#admin-add-time-entry");
export const adminRefreshHolidaysButton = query<HTMLButtonElement>("#admin-refresh-holidays");

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
