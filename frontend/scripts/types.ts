export interface FrontendConfig {
  apiBaseUrl?: string;
  guildId?: string;
  discordAuthorizeUrl?: string;
  discordClientId?: string;
  discordRedirectUri?: string;
  discordScopes?: string[];
  adminUserIds?: string[];
}

export interface DiscordSession {
  accessToken: string;
  tokenType: string;
  scope?: string;
  expiresAt?: number;
}

export interface DiscordUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface WorkerProfile {
  id?: string;
  role_id?: string;
  status?: string;
  member_id?: string;
  user_id?: string;
  [key: string]: unknown;
}

export interface WorkerSessionEntry {
  id?: string;
  start?: number;
  end?: number | null;
  status?: string;
  break?: number;
  overtime?: number;
  durationMinutes?: number;
  summary?: string | null;
  memberId?: string;
  [key: string]: unknown;
}

export interface TimeMetrics {
  totalMs?: number;
  breakMs?: number;
  sessionCount?: number;
  overtimeMs?: number;
  weeklyMs?: number;
  weeklyBreakMs?: number;
  dailyMs?: number;
  dailyBreakMs?: number;
  [key: string]: unknown;
}

export interface HolidayRequest {
  id?: string;
  member_id?: string;
  status?: string;
  created_at?: number;
  updated_at?: number;
  start?: number;
  end?: number;
  reason?: string;
  [key: string]: unknown;
}

export interface PayrollSummary {
  member_id?: string;
  hourly_rate?: number;
  weekly_hours?: number;
  total_hours?: number;
  note?: string;
  [key: string]: unknown;
}

export interface ClockSessionSummary {
  totalMs?: number;
  breakMs?: number;
  overtimeMs?: number;
  sessions?: WorkerSessionEntry[];
  started_at_ms?: number;
  [key: string]: unknown;
}

export interface AppState {
  baseUrl: string;
  guildId: string;
  discordAuthorizeUrl: string;
  discordClientId: string;
  discordRedirectUri: string;
  discordScopes: string[];
  adminUserIds: string[];
  discordToken: DiscordSession | null;
  user: DiscordUser | null;
  workerProfile: WorkerProfile | null;
  activeSession: ClockSessionSummary | null;
  timeMetrics: TimeMetrics | null;
  workerError: string | null;
  userEntries: WorkerSessionEntry[];
  userHolidays: HolidayRequest[];
  adminTimesheets: WorkerSessionEntry[];
  adminTimesheetWorker: WorkerProfile | null;
  adminTimesheetMemberId: string | null;
  adminHolidayRequests: HolidayRequest[];
  payroll: PayrollSummary | null;
  hoursReportRange: string;
  hoursReportReference: number;
}
