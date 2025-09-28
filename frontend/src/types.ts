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
   first_name?: string | null;
   last_name?: string | null;
   pronouns?: string | null;
   location?: string | null;
   timezone?: string | null;
   bio?: string | null;
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

export type AdminTabKey =
  | "departments"
  | "roles"
  | "developers"
  | "offboarding"
  | "performance"
  | "time-entries"
  | "holiday";

export interface AdminDepartmentSummary {
  id: string;
  name: string;
  roles_count: number;
  member_count: number;
}

export interface AdminRoleSummary {
  id: string;
  name: string;
  category: string;
  experience_levels: number;
  hourly_rate_low?: number;
  hourly_rate_high?: number;
  member_count: number;
}

export type ComplianceStatus = "on-track" | "warning" | "critical";

export interface AdminDeveloperSummary {
  user_id: string;
  member_label: string;
  status: string;
  role_id: string;
  role_name?: string;
  experience?: string | null;
  daily_hours: number;
  weekly_hours: number;
  total_hours: number;
  break_hours: number;
  meeting_goal_met: boolean;
  overtime_hours: number;
  on_leave: boolean;
  active_session: boolean;
  compliance_status: ComplianceStatus;
  last_activity?: number | null;
}

export interface AdminOffboardingCase {
  user_id: string;
  member_label: string;
  role_name?: string;
  status: string;
  reason: string;
  effective_date?: number | null;
}

export interface AdminTimeEntrySummary {
  user_id: string;
  member_label: string;
  role_name?: string;
  started_at_ms: number;
  ended_at_ms?: number | null;
  duration_minutes: number;
  summary?: string | null;
  status: string;
  admin_note?: string | null;
}

export interface AdminHolidayOverviewEntry {
  user_id: string;
  member_label: string;
  status: string;
  start?: number | null;
  end?: number | null;
  note?: string | null;
}

export interface AdminPerformanceSnapshot {
  total_developers: number;
  meeting_goals: number;
  overtime_logged_hours: number;
  active_developers: number;
  on_leave: number;
  lagging_developers: number;
}

export interface AdminOverviewResponse {
  performance: AdminPerformanceSnapshot;
  departments: AdminDepartmentSummary[];
  roles: AdminRoleSummary[];
  developers: AdminDeveloperSummary[];
  offboarding: AdminOffboardingCase[];
  time_entries: AdminTimeEntrySummary[];
  holidays: AdminHolidayOverviewEntry[];
  generated_at: number;
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
  adminHolidayRequests: HolidayRequest[];
  payroll: PayrollSummary | null;
  hoursReportRangeStart: number;
  hoursReportRangeEnd: number;
  hoursReportCalendarMonth: number | null;
  hoursReportCalendarFollowSelection: boolean;
  adminOverview: AdminOverviewResponse | null;
  adminOverviewLoading: boolean;
  adminOverviewError: string | null;
  adminActiveTab: AdminTabKey;
  profileLoading: boolean;
  profileSaving: boolean;
  profileError: string | null;
}
