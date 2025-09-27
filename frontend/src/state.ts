import { DEFAULT_DISCORD_AUTHORIZE_URL } from "./constants";
import type { AppState } from "./types";

const today = new Date();
today.setHours(0, 0, 0, 0);

const defaultRangeStart = new Date(today);
defaultRangeStart.setDate(today.getDate() - today.getDay());

const defaultRangeEnd = new Date(defaultRangeStart);
defaultRangeEnd.setDate(defaultRangeStart.getDate() + 7);

const defaultCalendarMonth = new Date(defaultRangeStart);
defaultCalendarMonth.setDate(1);

export const state: AppState = {
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
  hoursReportRangeStart: defaultRangeStart.getTime(),
  hoursReportRangeEnd: defaultRangeEnd.getTime(),
  hoursReportCalendarMonth: defaultCalendarMonth.getTime(),
  hoursReportCalendarFollowSelection: true,
};
