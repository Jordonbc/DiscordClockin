import { apiRequest, ensureGuildConfigured } from "./apiClient";
import { state } from "./state";
import type { GuildRoleDefinition, GuildRolesConfiguration, RoleFormPayload } from "./types";

function resolveErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const data = error as Record<string, unknown>;
    if (typeof data.message === "string") return data.message;
    if (typeof data.data === "string") return data.data;
    if (data.data && typeof data.data === "object" && typeof (data.data as any).message === "string") {
      return (data.data as any).message;
    }
  }
  return "";
}

function isUnauthorized(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as any).status === 401);
}

function normalizeRoleEntry(input: any): GuildRoleDefinition {
  const raw: Partial<GuildRoleDefinition> =
    input && typeof input === "object" ? (input as GuildRoleDefinition) : ({} as GuildRoleDefinition);

  const hourlySalary: Record<string, number> = {};
  if (raw.hourly_salary && typeof raw.hourly_salary === "object") {
    Object.entries(raw.hourly_salary).forEach(([key, value]) => {
      if (typeof key !== "string") return;
      const normalizedKey = key.trim();
      if (!normalizedKey) return;
      const rate = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(rate)) {
        hourlySalary[normalizedKey] = rate;
      }
    });
  }

  const experiences = Array.isArray(raw.experiences)
    ? raw.experiences.filter((entry) => typeof entry === "string" && entry.trim().length > 0)
    : [];

  return {
    id: typeof raw.id === "string" ? raw.id : "",
    name: typeof raw.name === "string" ? raw.name : "",
    category: typeof raw.category === "string" ? raw.category : "",
    experiences,
    hourly_salary: hourlySalary,
  };
}

function normalizeRolesConfiguration(data: any): GuildRolesConfiguration {
  const source = data && typeof data === "object" ? data : {};
  const payload =
    source && typeof source.roles === "object" && source.roles
      ? (source.roles as Record<string, unknown>)
      : source;

  const categories = Array.isArray((payload as any).categories)
    ? (payload as any).categories.filter((entry: unknown) => typeof entry === "string")
    : [];
  const experiences = Array.isArray((payload as any).experiences)
    ? (payload as any).experiences.filter((entry: unknown) => typeof entry === "string")
    : [];
  const roles = Array.isArray((payload as any).roles)
    ? (payload as any).roles.map((entry: unknown) => normalizeRoleEntry(entry))
    : [];

  const guildId =
    typeof (payload as any).guild_id === "string"
      ? ((payload as any).guild_id as string)
      : typeof (payload as any).guildId === "string"
      ? ((payload as any).guildId as string)
      : state.guildId;

  return {
    guild_id: guildId,
    categories,
    experiences,
    roles,
  };
}

export async function loadRolesConfiguration(options: { force?: boolean } = {}): Promise<void> {
  if (!options.force && state.rolesConfiguration && !state.rolesConfigurationError) {
    return;
  }

  try {
    ensureGuildConfigured();
  } catch (error) {
    state.rolesConfiguration = null;
    state.rolesConfigurationError = (error as Error).message || "Guild is not configured.";
    state.rolesConfigurationLoading = false;
    return;
  }

  state.rolesConfigurationLoading = true;

  try {
    const guildId = encodeURIComponent(state.guildId);
    const data = await apiRequest({ path: `guilds/${guildId}/roles`, silent: true });
    state.rolesConfiguration = normalizeRolesConfiguration(data);
    state.rolesConfigurationError = null;
  } catch (error) {
    state.rolesConfiguration = null;
    state.rolesConfigurationError = resolveErrorMessage(error) || "Unable to load roles configuration.";
    if (!isUnauthorized(error)) {
      throw error;
    }
  } finally {
    state.rolesConfigurationLoading = false;
  }
}

function applyRolesResponse(data: any): GuildRoleDefinition | null {
  const role = data && typeof data === "object" && (data as any).role ? (data as any).role : null;
  const rolesConfig = data && typeof data === "object" && (data as any).roles ? (data as any).roles : null;
  if (rolesConfig) {
    state.rolesConfiguration = normalizeRolesConfiguration(rolesConfig);
    state.rolesConfigurationError = null;
  }
  return role ? normalizeRoleEntry(role) : null;
}

export async function createRole(payload: RoleFormPayload): Promise<GuildRoleDefinition | null> {
  ensureGuildConfigured();
  const guildId = encodeURIComponent(state.guildId);
  const response = await apiRequest({
    path: `guilds/${guildId}/roles`,
    method: "POST",
    body: payload,
  });
  return applyRolesResponse(response);
}

export async function updateRole(
  roleId: string,
  payload: RoleFormPayload,
): Promise<GuildRoleDefinition | null> {
  ensureGuildConfigured();
  const guildId = encodeURIComponent(state.guildId);
  const encodedRoleId = encodeURIComponent(roleId);
  const response = await apiRequest({
    path: `guilds/${guildId}/roles/${encodedRoleId}`,
    method: "PATCH",
    body: payload,
  });
  return applyRolesResponse(response);
}

export async function deleteRole(roleId: string): Promise<GuildRoleDefinition | null> {
  ensureGuildConfigured();
  const guildId = encodeURIComponent(state.guildId);
  const encodedRoleId = encodeURIComponent(roleId);
  const response = await apiRequest({
    path: `guilds/${guildId}/roles/${encodedRoleId}`,
    method: "DELETE",
  });
  return applyRolesResponse(response);
}
