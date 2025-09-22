const config = window.CLOCKIN_FRONTEND_CONFIG || {};
const DEFAULT_DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";
const DISCORD_USER_API_URL = "https://discord.com/api/users/@me";
const DISCORD_STORAGE_KEY = "clockin.discordSession";
const DISCORD_OAUTH_STATE_KEY = "clockin.discordOAuthState";

const state = {
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
};

const navButtons = Array.from(document.querySelectorAll("[data-view-button]"));
const views = Array.from(document.querySelectorAll(".view"));
const viewJumpButtons = document.querySelectorAll("[data-view-jump]");
const heroLoginButton = document.querySelector("[data-hero-action='login']");

const connectionIndicator = document.querySelector("#connection-indicator");

const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const userSummary = document.querySelector("#user-summary");
const userName = document.querySelector("#user-name");
const userRoles = document.querySelector("#user-roles");
const userAvatar = document.querySelector("#user-avatar");

const clockState = document.querySelector("#clock-state");
const clockMessage = document.querySelector("#clock-message");
const clockInButton = document.querySelector("#clock-in");
const clockOutButton = document.querySelector("#clock-out");
const shiftSummaryContainer = document.querySelector(".shift-summary");
const clockSummaryInput = document.querySelector("#clock-out-summary");
const refreshMyTimeButton = document.querySelector("#refresh-my-time");
const myTimeEntries = document.querySelector("#my-time-entries");

const holidayForm = document.querySelector("#holiday-form");
const refreshHolidaysButton = document.querySelector("#refresh-holidays");
const holidayList = document.querySelector("#holiday-list");

const adminTimesheetForm = document.querySelector("#admin-timesheet-form");
const adminTimesheetRows = document.querySelector("#admin-timesheet-rows");
const refreshAdminTimesheets = document.querySelector(
  "#refresh-admin-timesheets",
);
const adminModifyHoursForm = document.querySelector(
  "#admin-modify-hours-form",
);

const adminHolidayList = document.querySelector("#admin-holiday-requests");
const refreshAdminHolidays = document.querySelector("#refresh-admin-holidays");
const adminHolidayForm = document.querySelector("#admin-holiday-form");

const adminRoleForm = document.querySelector("#admin-role-form");

const notifications = document.querySelector("#notifications");

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(start, end) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) return "—";
  const endTime = endDate && !Number.isNaN(endDate.getTime()) ? endDate : new Date();
  const diff = Math.max(0, endTime.getTime() - startDate.getTime());
  const totalMinutes = Math.round(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function showToast(message, type = "info") {
  if (!notifications) return;
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  notifications.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add("toast--visible");
  });
  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 250);
  }, 4500);
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

function clearDiscordSession(options = {}) {
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
}) {
  requireBaseUrl();
  const sanitizedPath = typeof path === "string" ? path.replace(/^\/+/, "") : "";
  const url = new URL(sanitizedPath, state.baseUrl);
  const options = {
    method,
    headers: { Accept: "application/json" },
    credentials: "include",
  };
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, options);
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
      const error = new Error(message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    updateConnectionIndicator({ ok: true });
    return data;
  } catch (error) {
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

  if (userSummary) {
    userSummary.hidden = !authed;
  }

  if (logoutButton) {
    logoutButton.hidden = !authed;
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
  } else {
    userName.textContent = "";
    userRoles.textContent = "";
    if (userAvatar) {
      userAvatar.removeAttribute("src");
    }
  }

  if (shiftSummaryContainer) {
    shiftSummaryContainer.hidden = !authed;
  }
  if (clockSummaryInput) {
    clockSummaryInput.disabled = !authed;
    if (!authed) {
      clockSummaryInput.value = "";
    }
  }

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

  const activeButton = navButtons.find((button) => button.classList.contains("is-active"));
  if (activeButton && activeButton.hidden) {
    switchView("home");
  }

  updateClockStatus();
}

function renderMyTime() {
  if (!myTimeEntries) return;
  myTimeEntries.innerHTML = "";

  if (state.workerError) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "muted";
    cell.textContent = state.workerError;
    row.appendChild(cell);
    myTimeEntries.appendChild(row);
    return;
  }

  if (!state.userEntries.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "muted";
    cell.textContent = "No shifts to display.";
    row.appendChild(cell);
    myTimeEntries.appendChild(row);
    return;
  }

  state.userEntries.forEach((entry) => {
    const row = document.createElement("tr");

    const startCell = document.createElement("td");
    startCell.textContent = formatDateTime(entry.start);

    const endCell = document.createElement("td");
    endCell.textContent = formatDateTime(entry.end);

    const durationCell = document.createElement("td");
    durationCell.textContent = formatDuration(entry.start, entry.end);

    const statusCell = document.createElement("td");
    statusCell.textContent = entry.status || (entry.end ? "Completed" : "Active");

    row.append(startCell, endCell, durationCell, statusCell);
    myTimeEntries.appendChild(row);
  });
}

function renderHolidayRequests() {
  if (!holidayList) return;
  holidayList.innerHTML = "";

  const item = document.createElement("li");
  item.className = "timeline__item muted";
  item.textContent = "Holiday requests are managed directly in Discord.";
  holidayList.appendChild(item);
}

function updateClockStatus() {
  if (!clockState || !clockMessage) return;

  if (!state.user) {
    clockState.textContent = "Waiting";
    clockState.className = "status-pill status-pill--idle";
    clockMessage.textContent = "Sign in to manage your shift.";
    return;
  }

  if (!state.guildId) {
    clockState.textContent = "Unknown";
    clockState.className = "status-pill status-pill--error";
    clockMessage.textContent = "Configure a guild ID to load your status.";
    return;
  }

  if (!state.workerProfile) {
    clockState.textContent = "Unknown";
    clockState.className = "status-pill status-pill--error";
    clockMessage.textContent =
      state.workerError || "No worker record found. Ask an admin to register you.";
    return;
  }

  const workerStatus = String(state.workerProfile.status || "").toLowerCase();
  const activeEntry = state.userEntries.find((entry) => !entry.end);

  if (workerStatus === "work") {
    const startedAt = state.activeSession?.started_at_ms || activeEntry?.start || null;
    clockState.textContent = "Active";
    clockState.className = "status-pill status-pill--success";
    clockMessage.textContent = startedAt
      ? `Clocked in at ${formatDateTime(startedAt)}.`
      : "You're currently clocked in.";
    return;
  }

  if (workerStatus === "break") {
    const startedAt = state.activeSession?.started_at_ms || null;
    clockState.textContent = "On break";
    clockState.className = "status-pill status-pill--idle";
    clockMessage.textContent = startedAt
      ? `On break since ${formatDateTime(startedAt)}.`
      : "You're currently on break.";
    return;
  }

  const latest = state.userEntries[0];
  clockState.textContent = "Offline";
  clockState.className = "status-pill status-pill--idle";
  clockMessage.textContent = latest?.end
    ? `Last shift ended ${formatDateTime(latest.end)}.`
    : "You're clocked out.";
}

function renderAdminTimesheets() {
  if (!adminTimesheetRows) return;
  adminTimesheetRows.innerHTML = "";

  if (!state.adminTimesheetMemberId) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "muted";
    cell.textContent = "Submit a search to view entries.";
    row.appendChild(cell);
    adminTimesheetRows.appendChild(row);
    return;
  }

  if (!state.adminTimesheets.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "muted";
    cell.textContent = "No sessions found for this member.";
    row.appendChild(cell);
    adminTimesheetRows.appendChild(row);
    return;
  }

  state.adminTimesheets.forEach((entry) => {
    const row = document.createElement("tr");

    const memberCell = document.createElement("td");
    memberCell.textContent =
      (state.adminTimesheetWorker && state.adminTimesheetWorker.user_id) ||
      entry.memberId ||
      "Unknown";

    const startCell = document.createElement("td");
    startCell.textContent = formatDateTime(entry.start);

    const endCell = document.createElement("td");
    endCell.textContent = formatDateTime(entry.end);

    const durationCell = document.createElement("td");
    durationCell.textContent = formatDuration(entry.start, entry.end);

    const statusCell = document.createElement("td");
    const currentStatus = state.adminTimesheetWorker?.status;
    statusCell.textContent = entry.status || currentStatus || "—";

    row.append(memberCell, startCell, endCell, durationCell, statusCell);
    adminTimesheetRows.appendChild(row);
  });
}

function renderAdminHolidays() {
  if (!adminHolidayList) return;
  adminHolidayList.innerHTML = "";

  const item = document.createElement("li");
  item.className = "timeline__item muted";
  item.textContent = "Holiday approvals are managed within Discord moderation tools.";
  adminHolidayList.appendChild(item);
}

async function refreshMyTime() {
  if (!state.user) return;
  const previousError = state.workerError;

  if (!state.guildId) {
    state.workerProfile = null;
    state.activeSession = null;
    state.timeMetrics = null;
    state.userEntries = [];
    state.workerError = "Guild ID is not configured.";
    renderMyTime();
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
    state.workerError = null;
  } catch (error) {
    state.workerProfile = null;
    state.activeSession = null;
    state.timeMetrics = null;
    state.userEntries = [];
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
  updateClockStatus();
  if (state.user) {
    renderAuthState();
  }
}

async function refreshHolidays() {
  renderHolidayRequests();
}

async function loadAdminTimesheets(memberId) {
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

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearDiscordSession();
      renderAuthState();
      showToast("Signed out.", "info");
      switchView("home");
    });
  }

  if (clockInButton) {
    clockInButton.addEventListener("click", async () => {
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
          },
        });
        showToast("Clocked in.", "success");
        await refreshMyTime();
      } catch (error) {
        // handled globally
      }
    });
  }

  if (clockOutButton) {
    clockOutButton.addEventListener("click", async () => {
      if (!state.user) {
        showToast("Sign in before clocking out.", "info");
        return;
      }
      try {
        ensureGuildConfigured();
      } catch (error) {
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
          },
        });
        showToast("Clocked out.", "success");
        if (clockSummaryInput) {
          clockSummaryInput.value = "";
        }
        await refreshMyTime();
      } catch (error) {
        // handled globally
      }
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
      const memberId = (formData.get("memberId") || "").trim();
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
      const memberId = (formData.get("memberId") || "").trim();
      const hours = Number(formData.get("hours"));
      const scope = (formData.get("scope") || "").toString().toLowerCase();
      const action = (formData.get("action") || "add").toString().toLowerCase();

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
      const memberId = (formData.get("memberId") || "").trim();
      const roleId = (formData.get("roleId") || "").trim();
      const experience = (formData.get("experience") || "").trim();

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
  if (!state.baseUrl) {
    showToast("Backend connection is not configured.", "error");
  }
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
