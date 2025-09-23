import {
  DEFAULT_DISCORD_AUTHORIZE_URL,
  DISCORD_OAUTH_STATE_KEY,
  DISCORD_STORAGE_KEY,
  DISCORD_USER_API_URL,
} from "./constants.js";
import { getRuntimeConfig } from "./runtimeConfig.js";
import { state } from "./state.js";
import {
  adminHolidayForm,
  adminModifyHoursForm,
  adminRoleForm,
  adminTimesheetForm,
  clockInButton,
  clockMessage,
  clockOutButton,
  clockOutModal,
  clockOutModalDismissButtons,
  clockOutModalForm,
  clockState,
  clockSummaryInput,
  connectionIndicator,
  dashboardClockMessage,
  dashboardClockStatus,
  heroLoginButton,
  holidayForm,
  hoursReportExportButton,
  hoursReportRangeButtons,
  loginButton,
  logoutButton,
  navButtons,
  refreshAdminHolidays,
  refreshAdminTimesheets,
  refreshHolidaysButton,
  refreshMyTimeButton,
  timeClockActionButton,
  timeClockStatusBadge,
  userAvatar,
  userMenu,
  userMenuAdmin,
  userMenuButton,
  userMenuDropdown,
  userMenuProfile,
  userName,
  userRoles,
  viewJumpButtons,
  views,
} from "./dom.js";
import { startTimeClockTicker, renderDashboardOverview, renderTimeClockPage, renderHoursReport } from "./ui/dashboard.js";
import { renderMyTime, renderHolidayRequests } from "./ui/myTime.js";
import { renderAdminTimesheets, renderAdminHolidays } from "./ui/admin.js";
import { showToast } from "./ui/notifications.js";
import {
  closeClockOutModal,
  closeUserMenu,
  hasActiveSession,
  isUserMenuOpen,
  openClockOutModal,
  toggleUserMenu,
  updateClockControlsVisibility,
} from "./ui/clockControls.js";
import { ClockStatus, getLastClockStatus, setLastClockStatus } from "./clockStatus.js";
import { formatDateTime } from "./utils/formatters.js";
import { calculateDurationMinutes } from "./utils/time.js";

const config = getRuntimeConfig();

interface ApiRequestOptions {
  path: string;
  method?: string;
  body?: unknown;
  expectJson?: boolean;
  silent?: boolean;
}

let eventSource: EventSource | null = null;
let eventStreamReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function disconnectEventStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (eventStreamReconnectTimer) {
    clearTimeout(eventStreamReconnectTimer);
    eventStreamReconnectTimer = null;
  }
}

function scheduleEventStreamReconnect(delayMs = 5000) {
  if (eventStreamReconnectTimer) {
    return;
  }
  eventStreamReconnectTimer = setTimeout(() => {
    eventStreamReconnectTimer = null;
    connectEventStream();
  }, Math.max(1000, delayMs));
}

function connectEventStream() {
  if (typeof EventSource === "undefined") {
    return;
  }

  if (!state.baseUrl || !state.guildId) {
    disconnectEventStream();
    return;
  }

  const url = new URL("events/stream", state.baseUrl);
  url.searchParams.set("guild_id", state.guildId);
  url.searchParams.set("event", "clock_in,clock_out");

  disconnectEventStream();

  eventSource = new EventSource(url.toString());
  eventSource.onmessage = (event) => {
    if (!event?.data) return;
    try {
      const payload = JSON.parse(event.data);
      handleHookEvent(payload);
    } catch (error) {
      console.warn("Failed to parse hook event payload", error);
    }
  };
  eventSource.onerror = () => {
    disconnectEventStream();
    scheduleEventStreamReconnect();
  };
}

function handleHookEvent(event) {
  if (!event || typeof event !== "object") return;
  if (event.guild_id && state.guildId && event.guild_id !== state.guildId) {
    return;
  }

  if (event.source === "web_app") {
    return;
  }

  const isSelf = state.user && event.user_id === state.user.id;
  if (!isSelf) {
    return;
  }

  refreshMyTime().catch(() => {});
}

function updateConnectionIndicator(status) {
  if (!connectionIndicator) return;
  const message = status.ok ? "" : status.message || "Offline";
  connectionIndicator.textContent = message;
  if (status.ok) {
    connectionIndicator.title = state.baseUrl
      ? `Connected to configured backend`
      : "Connected";
  } else {
    connectionIndicator.title = message;
  }
  connectionIndicator.classList.toggle(
    "status-pill--success",
    Boolean(status.ok),
  );
  connectionIndicator.classList.toggle(
    "status-pill--error",
    !status.ok,
  );
  connectionIndicator.classList.toggle("status-pill--idle", false);
}

function normalizeBaseUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch (error) {
    throw new Error("Invalid backend URL");
  }

  let { pathname } = parsed;
  const hasVersion = /\/api\/v\d+(?:\/|$)/i.test(pathname);
  const endsWithApi = /\/api\/?$/i.test(pathname);
  const isRoot = pathname === "/" || pathname === "";

  if (hasVersion) {
    if (!pathname.endsWith("/")) {
      pathname = `${pathname}/`;
    }
  } else if (isRoot) {
    pathname = "/api/v1/";
  } else if (endsWithApi) {
    pathname = pathname.replace(/\/api\/?$/i, "/api/v1/");
  } else if (!pathname.endsWith("/")) {
    pathname = `${pathname}/`;
  }

  parsed.pathname = pathname;
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString();
}

function configureBaseUrl() {
  const configured =
    config && typeof config.apiBaseUrl === "string"
      ? config.apiBaseUrl.trim()
      : "";

  if (!configured) {
    state.baseUrl = "";
    updateConnectionIndicator({
      ok: false,
      message: "Backend not configured",
    });
    return;
  }

  try {
    state.baseUrl = normalizeBaseUrl(configured);
    updateConnectionIndicator({ ok: true });
  } catch (error) {
    state.baseUrl = "";
    const message = error instanceof Error ? error.message : "Invalid backend URL";
    updateConnectionIndicator({ ok: false, message });
    showToast(message, "error");
  }
}

function configureGuild() {
  const guildId =
    config && typeof config.guildId === "string" ? config.guildId.trim() : "";

  state.guildId = guildId;

  if (!guildId) {
    console.warn("Guild ID is not configured; backend requests require a guild context.");
  }
}

function configureDiscordLogin() {
  const clientId =
    config && typeof config.discordClientId === "string"
      ? config.discordClientId.trim()
      : "";

  if (!clientId) {
    console.warn("Discord login is not configured; missing client ID.");
  }

  state.discordClientId = clientId;

  const redirectUri =
    config && typeof config.discordRedirectUri === "string"
      ? config.discordRedirectUri.trim()
      : "";

  const { origin, pathname, search } = window.location;
  state.discordRedirectUri = redirectUri || `${origin}${pathname}${search}`;

  const authorizeUrl =
    config && typeof config.discordAuthorizeUrl === "string"
      ? config.discordAuthorizeUrl.trim()
      : "";
  state.discordAuthorizeUrl = authorizeUrl || DEFAULT_DISCORD_AUTHORIZE_URL;

  const scopes = Array.isArray(config.discordScopes)
    ? config.discordScopes
        .map((scope) => (typeof scope === "string" ? scope.trim() : ""))
        .filter(Boolean)
    : [];
  state.discordScopes = scopes.length ? scopes : ["identify"];

  state.adminUserIds = Array.isArray(config.adminUserIds)
    ? config.adminUserIds
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean)
    : [];
}

function generateOAuthStateToken(length = 16) {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

function storeOAuthState(value) {
  try {
    window.sessionStorage.setItem(DISCORD_OAUTH_STATE_KEY, value);
  } catch (error) {
    console.warn("Unable to persist OAuth state", error);
  }
}

function consumeOAuthState(received) {
  let stored = null;
  try {
    stored = window.sessionStorage.getItem(DISCORD_OAUTH_STATE_KEY);
    window.sessionStorage.removeItem(DISCORD_OAUTH_STATE_KEY);
  } catch (error) {
    console.warn("Unable to read OAuth state", error);
  }

  if (!stored) {
    return true;
  }

  return stored === received;
}

function persistDiscordSession(session) {
  try {
    window.localStorage.setItem(DISCORD_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Unable to persist Discord session", error);
  }
}

function loadPersistedDiscordSession() {
  try {
    const raw = window.localStorage.getItem(DISCORD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.accessToken || !parsed.tokenType) return null;
    if (parsed.expiresAt && Date.now() >= parsed.expiresAt) {
      clearPersistedDiscordSession();
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Unable to load Discord session", error);
    return null;
  }
}

function clearPersistedDiscordSession() {
  try {
    window.localStorage.removeItem(DISCORD_STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to clear Discord session", error);
  }
}

function clearUrlHash() {
  const { pathname, search } = window.location;
  window.history.replaceState(null, document.title, `${pathname}${search}`);
}

function extractTokenFromHash() {
  const { hash } = window.location;
  if (!hash || hash.length <= 1) return null;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  const stateParam = params.get("state");
  const stateValid = consumeOAuthState(stateParam);
  if (!stateValid) {
    showToast("Login verification failed. Please try again.", "error");
    clearUrlHash();
    return null;
  }

  const tokenType = params.get("token_type") || "Bearer";
  const expiresIn = parseInt(params.get("expires_in") || "", 10);
  const scope = params.get("scope");
  const now = Date.now();
  const expiresAt = Number.isFinite(expiresIn)
    ? now + Math.max(0, expiresIn) * 1000
    : now + 3600 * 1000;

  clearUrlHash();

  return {
    accessToken,
    tokenType,
    expiresAt,
    scope,
  };
}

function clearDiscordSession(options: { skipStorage?: boolean } = {}) {
  state.discordToken = null;
  state.user = null;
  if (!options.skipStorage) {
    clearPersistedDiscordSession();
  }
}

async function fetchDiscordProfile(token) {
  const response = await fetch(DISCORD_USER_API_URL, {
    headers: {
      Authorization: `${token.tokenType} ${token.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord profile: ${response.status}`);
  }

  return response.json();
}

function resolveAvatarUrl(profile) {
  if (profile.avatar) {
    return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`;
  }

  const discriminator = profile.discriminator ? Number.parseInt(profile.discriminator, 10) : 0;
  const index = Number.isFinite(discriminator) ? discriminator % 5 : 0;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function resolveUserRoles(userId) {
  if (!userId) return [];
  return state.adminUserIds.includes(userId) ? ["admin"] : [];
}

async function hydrateDiscordSession() {
  const fragmentToken = extractTokenFromHash();
  const hadFragment = Boolean(fragmentToken);

  if (fragmentToken) {
    state.discordToken = fragmentToken;
    persistDiscordSession(fragmentToken);
  } else {
    const storedToken = loadPersistedDiscordSession();
    if (storedToken) {
      state.discordToken = storedToken;
    }
  }

  if (!state.discordToken) {
    renderAuthState();
    return;
  }

  if (state.discordToken.expiresAt && Date.now() >= state.discordToken.expiresAt) {
    clearDiscordSession();
    renderAuthState();
    return;
  }

  try {
    const profile = await fetchDiscordProfile(state.discordToken);
    state.user = {
      id: profile.id,
      username: profile.username,
      displayName: profile.global_name || profile.username,
      avatarUrl: resolveAvatarUrl(profile),
      roles: resolveUserRoles(profile.id),
    };
    if (hadFragment) {
      showToast(`Welcome, ${state.user.displayName || state.user.username}!`, "success");
    }
    if (state.baseUrl && state.guildId) {
      await refreshMyTime();
    }
  } catch (error) {
    console.error("Unable to hydrate Discord session", error);
    clearDiscordSession();
    showToast("Discord session expired. Please sign in again.", "error");
  } finally {
    renderAuthState();
  }
}

function requireBaseUrl() {
  if (!state.baseUrl) {
    const message = "Backend connection is not configured.";
    updateConnectionIndicator({ ok: false, message });
    showToast(message, "error");
    throw new Error("Missing base URL");
  }
}

function ensureGuildConfigured() {
  if (!state.guildId) {
    const message = "Guild ID is not configured.";
    showToast(message, "error");
    throw new Error("Missing guild ID");
  }
}

async function apiRequest({
  path,
  method = "GET",
  body,
  expectJson = true,
  silent = false,
}: ApiRequestOptions) {
  requireBaseUrl();
  const sanitizedPath = typeof path === "string" ? path.replace(/^\/+/, "") : "";
  const url = new URL(sanitizedPath, state.baseUrl);
  const options: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: { Accept: "application/json" },
    credentials: "include",
  };
  if (body !== undefined && method !== "GET") {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
    });
    const contentType = response.headers.get("content-type") || "";
    const isJson = expectJson && contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        data && typeof data === "object" && data.message
          ? data.message
          : typeof data === "string"
          ? data
          : "Request failed";
      const error: any = new Error(message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    updateConnectionIndicator({ ok: true });
    return data;
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : "Unable to reach the backend";
    if (error && typeof error === "object" && "status" in error) {
      if (error.status === 401) {
        updateConnectionIndicator({ ok: true });
      } else {
        updateConnectionIndicator({ ok: false, message });
      }
      if (!silent && error.status !== 401) {
        showToast(message, "error");
      }
    } else {
      updateConnectionIndicator({ ok: false, message });
      if (!silent) {
        showToast(message, "error");
      }
    }
    throw error;
  }
}

function switchView(target) {
  views.forEach((view) => {
    const shouldDisplay = view.dataset.view === target;
    view.classList.toggle("view--active", shouldDisplay);
  });
  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewButton === target);
  });

  if (target === "my-time") {
    refreshMyTime();
    refreshHolidays();
  } else if (target === "time-clock") {
    refreshMyTime();
  } else if (target === "hours-report") {
    refreshMyTime();
  } else if (target === "admin") {
    loadAdminTimesheets();
    loadAdminHolidays();
  }
}

function canAccessAdmin() {
  return Boolean(state.user && Array.isArray(state.user.roles) && state.user.roles.includes("admin"));
}

function renderAuthState() {
  const authed = Boolean(state.user);

  if (loginButton) loginButton.hidden = authed;
  if (heroLoginButton) heroLoginButton.hidden = authed;

  if (userMenu) {
    userMenu.hidden = !authed;
    if (!authed) {
      closeUserMenu();
    }
  }

  if (logoutButton) {
    logoutButton.hidden = !authed;
  }

  if (userMenuAdmin) {
    userMenuAdmin.hidden = !(authed && canAccessAdmin());
  }

  if (authed) {
    userName.textContent = state.user.displayName || state.user.username || "User";
    const roleDetails = [];
    if (state.workerProfile && state.workerProfile.role_id) {
      roleDetails.push(`Role ID: ${state.workerProfile.role_id}`);
    }
    if (Array.isArray(state.user.roles) && state.user.roles.includes("admin")) {
      roleDetails.push("Admin");
    }
    userRoles.textContent = roleDetails.length
      ? roleDetails.join(" • ")
      : "No role assigned";
    if (state.user.avatarUrl) {
      userAvatar.src = state.user.avatarUrl;
      userAvatar.alt = `${state.user.displayName || "User"} avatar`;
    } else {
      userAvatar.removeAttribute("src");
      userAvatar.alt = "";
    }
    if (userMenuButton) {
      const label = state.user.displayName || state.user.username || "Profile";
      userMenuButton.setAttribute("aria-label", label);
      userMenuButton.setAttribute("title", label);
    }
  } else {
    userName.textContent = "";
    userRoles.textContent = "";
    if (userAvatar) {
      userAvatar.removeAttribute("src");
    }
  }

  updateClockControlsVisibility();

  navButtons.forEach((button) => {
    const requiresAuth = button.dataset.requiresAuth === "true";
    const requiresRole = button.dataset.requiresRole;
    let visible = true;
    if (requiresAuth) {
      visible = authed;
    }
    if (requiresRole) {
      visible = visible && requiresRole === "admin" ? canAccessAdmin() : visible;
    }
    button.hidden = !visible;
  });

  viewJumpButtons.forEach((button) => {
    const requiresAuth = button.dataset.requiresAuth === "true";
    const requiresRole = button.dataset.requiresRole;
    let visible = true;
    if (requiresAuth) {
      visible = authed;
    }
    if (requiresRole) {
      visible = visible && requiresRole === "admin" ? canAccessAdmin() : visible;
    }
    button.hidden = !visible;
  });

  renderHoursReport();

  const activeButton = navButtons.find((button) => button.classList.contains("is-active"));
  if (activeButton && activeButton.hidden) {
    switchView("home");
  }

  updateClockStatus();
  renderDashboardOverview();
}

function resolveClockStatus(): ClockStatus {
  if (!state.user) {
    return {
      label: "Waiting",
      className: "status-pill status-pill--idle",
      message: "Sign in to manage your shift.",
    };
  }

  if (!state.guildId) {
    return {
      label: "Unknown",
      className: "status-pill status-pill--error",
      message: "Configure a guild ID to load your status.",
    };
  }

  if (!state.workerProfile) {
    return {
      label: "Unknown",
      className: "status-pill status-pill--error",
      message: state.workerError || "No worker record found. Ask an admin to register you.",
    };
  }

  const workerStatus = String(state.workerProfile.status || "").toLowerCase();
  const activeEntry = state.userEntries.find((entry) => !entry.end);

  if (workerStatus === "work") {
    const startedAt = state.activeSession?.started_at_ms || activeEntry?.start || null;
    return {
      label: "Active",
      className: "status-pill status-pill--success",
      message: startedAt
        ? `Clocked in at ${formatDateTime(startedAt)}.`
        : "You're currently clocked in.",
    };
  }

  if (workerStatus === "break") {
    const startedAt = state.activeSession?.started_at_ms || null;
    return {
      label: "On break",
      className: "status-pill status-pill--idle",
      message: startedAt
        ? `On break since ${formatDateTime(startedAt)}.`
        : "You're currently on break.",
    };
  }

  const latest = state.userEntries[0];
  return {
    label: "Offline",
    className: "status-pill status-pill--idle",
    message: latest?.end
      ? `Last shift ended ${formatDateTime(latest.end)}.`
      : "You're clocked out.",
  };
}

function updateClockStatus() {
  updateClockControlsVisibility();

  const status = resolveClockStatus();
  setLastClockStatus(status);

  if (clockState) {
    clockState.textContent = status.label;
    clockState.className = status.className;
  }

  if (clockMessage) {
    clockMessage.textContent = status.message;
  }

  if (dashboardClockStatus) {
    dashboardClockStatus.textContent = status.label;
    dashboardClockStatus.className = status.className;
  }

  if (dashboardClockMessage) {
    dashboardClockMessage.textContent = status.message;
  }

  renderTimeClockPage();
}

async function refreshMyTime() {
  if (!state.user) return;
  const previousError = state.workerError;

  if (!state.guildId) {
    state.workerProfile = null;
    state.activeSession = null;
    state.timeMetrics = null;
    state.userEntries = [];
    state.payroll = null;
    state.workerError = "Guild ID is not configured.";
    renderMyTime();
    renderDashboardOverview();
    updateClockStatus();
    return;
  }

  try {
    const path = `timesheets/${encodeURIComponent(state.guildId)}/${encodeURIComponent(
      state.user.id,
    )}`;
    const data = await apiRequest({ path, silent: true });
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    state.userEntries = sessions
      .map((session) => ({
        start: session.started_at_ms ?? null,
        end: session.ended_at_ms ?? null,
        status: session.ended_at_ms ? "Completed" : "Active",
        durationMinutes:
          typeof session.duration_minutes === "number"
            ? session.duration_minutes
            : calculateDurationMinutes(session.started_at_ms, session.ended_at_ms),
        summary:
          typeof session.summary === "string" && session.summary.trim()
            ? session.summary.trim()
            : null,
      }))
      .sort((a, b) => {
        const aTime = a.start ? new Date(a.start).getTime() : 0;
        const bTime = b.start ? new Date(b.start).getTime() : 0;
        return bTime - aTime;
      });
    state.workerProfile = data?.worker || null;
    state.activeSession = data?.active_session || null;
    state.timeMetrics = data?.metrics || null;
    state.payroll = data?.payroll || null;
    state.workerError = null;
  } catch (error) {
    state.workerProfile = null;
    state.activeSession = null;
    state.timeMetrics = null;
    state.userEntries = [];
    state.payroll = null;
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      const missingMessage = "No worker record found. Ask an admin to register you.";
      state.workerError = missingMessage;
      updateConnectionIndicator({ ok: true });
      if (previousError !== missingMessage) {
        showToast(missingMessage, "info");
      }
    } else {
      state.workerError = null;
      // error toast handled in apiRequest unless silent
      if (!error || typeof error !== "object" || error.status !== 404) {
        showToast("Failed to load timesheet.", "error");
      }
    }
  }

  renderMyTime();
  renderDashboardOverview();
  renderHoursReport();
  updateClockStatus();
  if (state.user) {
    renderAuthState();
  }
}

async function refreshHolidays() {
  renderHolidayRequests();
}

async function loadAdminTimesheets(memberId?: string) {
  if (!canAccessAdmin()) return;

  if (typeof memberId === "string") {
    state.adminTimesheetMemberId = memberId.trim() || null;
  }

  if (!state.adminTimesheetMemberId) {
    state.adminTimesheets = [];
    state.adminTimesheetWorker = null;
    renderAdminTimesheets();
    return;
  }

  try {
    ensureGuildConfigured();
  } catch (error) {
    state.adminTimesheets = [];
    state.adminTimesheetWorker = null;
    renderAdminTimesheets();
    return;
  }

  try {
    const path = `timesheets/${encodeURIComponent(state.guildId)}/${encodeURIComponent(
      state.adminTimesheetMemberId,
    )}`;
    const data = await apiRequest({ path, silent: true });
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    state.adminTimesheets = sessions
      .map((session) => ({
        memberId: state.adminTimesheetMemberId,
        start: session.started_at_ms ?? null,
        end: session.ended_at_ms ?? null,
        status: session.ended_at_ms ? "Completed" : "Active",
      }))
      .sort((a, b) => {
        const aTime = a.start ? new Date(a.start).getTime() : 0;
        const bTime = b.start ? new Date(b.start).getTime() : 0;
        return bTime - aTime;
      });
    state.adminTimesheetWorker = data?.worker || null;
  } catch (error) {
    state.adminTimesheets = [];
    state.adminTimesheetWorker = null;
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      showToast("No worker record found for that member.", "info");
    } else {
      showToast("Failed to load member timesheet.", "error");
    }
  }

  renderAdminTimesheets();
}

function loadAdminHolidays() {
  if (!canAccessAdmin()) return;
  renderAdminHolidays();
  showToast("Holiday approvals are handled inside Discord.", "info");
}

function bindEvents() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchView(button.dataset.viewButton);
    });
  });

  viewJumpButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.viewJump;
      if (!target) return;
      if (target !== "home" && !state.user) {
        showToast("Sign in to access this section.", "info");
        return;
      }
      const requiresRole = button.dataset.requiresRole;
      if (requiresRole === "admin" && !canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      switchView(target);
    });
  });

  if (heroLoginButton) {
    heroLoginButton.addEventListener("click", () => {
      if (state.user) {
        switchView("my-time");
      } else {
        initiateLogin();
      }
    });
  }

  if (loginButton) {
    loginButton.addEventListener("click", initiateLogin);
  }

  if (userMenuButton) {
    userMenuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!state.user) return;
      toggleUserMenu();
    });
  }

  if (userMenuDropdown) {
    userMenuDropdown.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  if (userMenuProfile) {
    userMenuProfile.addEventListener("click", () => {
      if (!state.user) {
        closeUserMenu();
        showToast("Sign in to view your profile.", "info");
        return;
      }
      closeUserMenu();
      switchView("my-time");
    });
  }

  if (userMenuAdmin) {
    userMenuAdmin.addEventListener("click", () => {
      closeUserMenu();
      if (!canAccessAdmin()) {
        showToast("Admin access is required.", "info");
        return;
      }
      switchView("admin");
    });
  }

  document.addEventListener("click", (event) => {
    if (!isUserMenuOpen()) return;
    if (userMenu && event.target instanceof Node && userMenu.contains(event.target)) {
      return;
    }
    closeUserMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeUserMenu();
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      closeUserMenu();
      clearDiscordSession();
      renderAuthState();
      showToast("Signed out.", "info");
      switchView("home");
    });
  }

  if (clockInButton) {
    clockInButton.addEventListener("click", performClockIn);
  }

  if (clockOutButton) {
    clockOutButton.addEventListener("click", promptClockOut);
  }

  if (clockOutModalForm) {
    clockOutModalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.user) {
        showToast("Sign in before clocking out.", "info");
        closeClockOutModal();
        return;
      }
      try {
        ensureGuildConfigured();
      } catch (error) {
        closeClockOutModal();
        return;
      }
      if (!hasActiveSession()) {
        showToast("No active shift to clock out from.", "info");
        closeClockOutModal();
        return;
      }
      const summary = clockSummaryInput ? clockSummaryInput.value.trim() : "";
      if (!summary) {
        showToast("Add a summary before clocking out.", "info");
        if (clockSummaryInput) {
          clockSummaryInput.focus();
        }
        return;
      }
      try {
        await apiRequest({
          path: "shifts/end",
          method: "POST",
          body: {
            guild_id: state.guildId,
            user_id: state.user.id,
            summary,
            source: "web_app",
          },
        });
        showToast("Clocked out.", "success");
        if (clockSummaryInput) {
          clockSummaryInput.value = "";
        }
        closeClockOutModal();
        await refreshMyTime();
      } catch (error) {
        // handled globally
      }
    });
  }

  if (clockOutModalDismissButtons.length) {
    clockOutModalDismissButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeClockOutModal();
      });
    });
  }

  if (refreshMyTimeButton) {
    refreshMyTimeButton.addEventListener("click", refreshMyTime);
  }

  if (holidayForm) {
    holidayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      showToast("Holiday requests are handled inside Discord.", "info");
    });
  }

  if (refreshHolidaysButton) {
    refreshHolidaysButton.addEventListener("click", refreshHolidays);
  }

  if (adminTimesheetForm) {
    adminTimesheetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      const formData = new FormData(adminTimesheetForm);
      const memberId = String(formData.get("memberId") ?? "").trim();
      if (!memberId) {
        state.adminTimesheetMemberId = null;
        state.adminTimesheets = [];
        state.adminTimesheetWorker = null;
        renderAdminTimesheets();
        showToast("Enter a Discord ID to load a timesheet.", "info");
        return;
      }
      await loadAdminTimesheets(memberId);
    });
  }

  if (refreshAdminTimesheets) {
    refreshAdminTimesheets.addEventListener("click", async () => {
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      await loadAdminTimesheets();
    });
  }

  if (adminModifyHoursForm) {
    adminModifyHoursForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      try {
        ensureGuildConfigured();
      } catch (error) {
        return;
      }
      const formData = new FormData(adminModifyHoursForm);
      const memberId = String(formData.get("memberId") ?? "").trim();
      const hours = Number(formData.get("hours"));
      const scope = String(formData.get("scope") ?? "").toLowerCase();
      const action = String(formData.get("action") ?? "add").toLowerCase();

      if (!memberId) {
        showToast("Provide a member ID.", "error");
        return;
      }

      if (!Number.isFinite(hours) || hours <= 0) {
        showToast("Enter a positive number of hours.", "error");
        return;
      }

      if (!["daily", "weekly", "total"].includes(scope)) {
        showToast("Select a valid scope.", "error");
        return;
      }

      const endpoint = action === "remove" ? "workers/hours/remove" : "workers/hours/add";
      const payload = {
        guild_id: state.guildId,
        user_id: memberId,
        hours,
        scope,
      };
      try {
        await apiRequest({ path: endpoint, method: "POST", body: payload });
        showToast("Hours updated.", "success");
        adminModifyHoursForm.reset();
        if (state.adminTimesheetMemberId === memberId) {
          await loadAdminTimesheets();
        }
        if (state.user && state.user.id === memberId) {
          await refreshMyTime();
        }
      } catch (error) {
        // handled globally
      }
    });
  }

  if (refreshAdminHolidays) {
    refreshAdminHolidays.addEventListener("click", loadAdminHolidays);
  }

  if (adminHolidayForm) {
    adminHolidayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      showToast("Handle holiday approvals from the Discord bot.", "info");
    });
  }

  if (adminRoleForm) {
    adminRoleForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      const formData = new FormData(adminRoleForm);
      try {
        ensureGuildConfigured();
      } catch (error) {
        return;
      }
      const memberId = String(formData.get("memberId") ?? "").trim();
      const roleId = String(formData.get("roleId") ?? "").trim();
      const experience = String(formData.get("experience") ?? "").trim();

      if (!memberId || !roleId) {
        showToast("Provide both a member ID and role ID.", "error");
        return;
      }

      const payload = {
        guild_id: state.guildId,
        user_id: memberId,
        role_id: roleId,
        experience: experience || undefined,
      };
      try {
        await apiRequest({
          path: "workers/change-role",
          method: "POST",
          body: payload,
        });
        showToast("Role updated.", "success");
        adminRoleForm.reset();
        if (state.adminTimesheetMemberId === memberId) {
          await loadAdminTimesheets();
        }
        if (state.user && state.user.id === memberId) {
          await refreshMyTime();
        }
      } catch (error) {
        // handled globally
      }
    });
  }

  if (timeClockActionButton) {
    timeClockActionButton.addEventListener("click", () => {
      if (timeClockActionButton.disabled) return;
      const action = timeClockActionButton.dataset.action;
      if (action === "login") {
        initiateLogin();
      } else if (action === "clock-in") {
        performClockIn();
      } else if (action === "clock-out") {
        promptClockOut();
      }
    });
  }

  hoursReportRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const { reportRange } = button.dataset;
      if (!reportRange || state.hoursReportRange === reportRange) return;
      state.hoursReportRange = reportRange;
      renderHoursReport();
    });
  });

  if (hoursReportExportButton) {
    hoursReportExportButton.addEventListener("click", () => {
      if (!state.user) {
        showToast("Sign in to export your hours.", "info");
        return;
      }
      showToast("CSV export coming soon. Use the admin dashboard for full exports.", "info");
    });
  }
}

async function performClockIn() {
  if (!state.user) {
    showToast("Sign in before clocking in.", "info");
    return;
  }
  try {
    ensureGuildConfigured();
  } catch (error) {
    return;
  }
  try {
    await apiRequest({
      path: "shifts/start",
      method: "POST",
      body: {
        guild_id: state.guildId,
        user_id: state.user.id,
        source: "web_app",
      },
    });
    showToast("Clocked in.", "success");
    await refreshMyTime();
  } catch (error) {
    // handled globally
  }
}

function promptClockOut() {
  if (!state.user) {
    showToast("Sign in before clocking out.", "info");
    return;
  }
  try {
    ensureGuildConfigured();
  } catch (error) {
    return;
  }
  if (!hasActiveSession()) {
    showToast("No active shift to clock out from.", "info");
    return;
  }
  openClockOutModal();
}

function initiateLogin() {
  if (!state.discordClientId) {
    showToast("Discord login is not configured.", "error");
    return;
  }

  const oauthState = generateOAuthStateToken();
  storeOAuthState(oauthState);

  const params = new URLSearchParams({
    client_id: state.discordClientId,
    redirect_uri: state.discordRedirectUri,
    response_type: "token",
    scope: state.discordScopes.join(" "),
    state: oauthState,
    prompt: "consent",
  });

  const authorizeUrl = `${state.discordAuthorizeUrl}?${params.toString()}`;
  window.location.href = authorizeUrl;
}

function initialize() {
  configureBaseUrl();
  configureDiscordLogin();
  configureGuild();
  connectEventStream();
  if (!state.baseUrl) {
    showToast("Backend connection is not configured.", "error");
  }
  startTimeClockTicker();
  bindEvents();
  renderAuthState();
  renderHolidayRequests();

  hydrateDiscordSession().then(() => {
    if (state.user && state.baseUrl && state.guildId) {
      switchView("my-time");
    }
  });
}

initialize();
