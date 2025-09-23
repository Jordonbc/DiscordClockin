import { DEFAULT_DISCORD_AUTHORIZE_URL } from "./constants.js";
import type { AppState } from "./types";

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
  hoursReportRange: "weekly",
};
