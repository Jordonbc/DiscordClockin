import { apiRequest, ensureGuildConfigured } from "./apiClient";
import { state } from "./state";
import { showToast } from "./ui/notifications";
import { canAccessAdmin } from "./permissions";
import { renderAdminOverview } from "./ui/admin";
import type { AdminOverviewResponse, AdminTabKey } from "./types";

export async function loadAdminOverview(options: { force?: boolean } = {}): Promise<void> {
  if (!canAccessAdmin()) {
    state.adminOverview = null;
    state.adminOverviewError = null;
    state.adminOverviewLoading = false;
    renderAdminOverview();
    return;
  }

  try {
    ensureGuildConfigured();
  } catch (error) {
    state.adminOverview = null;
    state.adminOverviewError = (error as Error).message || "Guild is not configured.";
    state.adminOverviewLoading = false;
    renderAdminOverview();
    return;
  }

  if (!options.force && state.adminOverview && !state.adminOverviewError) {
    renderAdminOverview();
    return;
  }

  state.adminOverviewLoading = true;
  renderAdminOverview();

  try {
    const path = `admin/overview/${encodeURIComponent(state.guildId)}`;
    const data = await apiRequest({ path, silent: true });
    state.adminOverview = normalizeOverviewResponse(data);
    state.adminOverviewError = null;
  } catch (error: any) {
    const message = resolveErrorMessage(error) || "Unable to load admin overview.";
    state.adminOverview = null;
    state.adminOverviewError = message;
    if (!error || typeof error !== "object" || error.status !== 401) {
      showToast(message, "error");
    }
  } finally {
    state.adminOverviewLoading = false;
    renderAdminOverview();
  }
}

export function setAdminActiveTab(tab: AdminTabKey): void {
  if (state.adminActiveTab === tab) return;
  state.adminActiveTab = tab;
  renderAdminOverview();
}

export function refreshAdminOverview(): Promise<void> {
  return loadAdminOverview({ force: true });
}

interface DepartmentPayload {
  name: string;
}

export async function createDepartment(payload: DepartmentPayload): Promise<void> {
  ensureGuildConfigured();
  const guildId = encodeURIComponent(state.guildId);
  await apiRequest({
    path: `guilds/${guildId}/departments`,
    method: "POST",
    body: { name: payload.name },
  });
}

export async function updateDepartment(
  departmentId: string,
  payload: DepartmentPayload,
): Promise<void> {
  ensureGuildConfigured();
  const guildId = encodeURIComponent(state.guildId);
  const encodedDepartmentId = encodeURIComponent(departmentId);
  await apiRequest({
    path: `guilds/${guildId}/departments/${encodedDepartmentId}`,
    method: "PATCH",
    body: { name: payload.name },
  });
}

export async function deleteDepartment(departmentId: string): Promise<void> {
  ensureGuildConfigured();
  const guildId = encodeURIComponent(state.guildId);
  const encodedDepartmentId = encodeURIComponent(departmentId);
  await apiRequest({
    path: `guilds/${guildId}/departments/${encodedDepartmentId}`,
    method: "DELETE",
  });
}

function normalizeOverviewResponse(input: any): AdminOverviewResponse {
  const fallbackPerformance = {
    total_developers: 0,
    meeting_goals: 0,
    overtime_logged_hours: 0,
    active_developers: 0,
    on_leave: 0,
    lagging_developers: 0,
  };

  if (!input || typeof input !== "object") {
    return {
      performance: fallbackPerformance,
      departments: [],
      roles: [],
      developers: [],
      offboarding: [],
      time_entries: [],
      holidays: [],
      generated_at: Date.now(),
    };
  }

  const data = input as Partial<AdminOverviewResponse>;
  return {
    performance: {
      total_developers: Number(data.performance?.total_developers) || 0,
      meeting_goals: Number(data.performance?.meeting_goals) || 0,
      overtime_logged_hours: Number(data.performance?.overtime_logged_hours) || 0,
      active_developers: Number(data.performance?.active_developers) || 0,
      on_leave: Number(data.performance?.on_leave) || 0,
      lagging_developers: Number(data.performance?.lagging_developers) || 0,
    },
    departments: Array.isArray(data.departments) ? data.departments : [],
    roles: Array.isArray(data.roles) ? data.roles : [],
    developers: Array.isArray(data.developers) ? data.developers : [],
    offboarding: Array.isArray(data.offboarding) ? data.offboarding : [],
    time_entries: Array.isArray(data.time_entries) ? data.time_entries : [],
    holidays: Array.isArray(data.holidays) ? data.holidays : [],
    generated_at: Number(data.generated_at) || Date.now(),
  };
}

function resolveErrorMessage(error: any): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    if (typeof error.message === "string") return error.message;
    if (typeof error.data === "string") return error.data;
    if (error.data && typeof error.data === "object" && typeof error.data.message === "string") {
      return error.data.message;
    }
  }
  return "";
}
