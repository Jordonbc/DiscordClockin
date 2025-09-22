const config = window.CLOCKIN_FRONTEND_CONFIG || {};

const state = {
  baseUrl: "",
  user: null,
  userEntries: [],
  userHolidays: [],
  adminTimesheets: [],
  adminHolidayRequests: [],
  adminFilters: null,
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
  const message = status.ok ? "Connected" : status.message || "Offline";
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

  state.baseUrl = configured.replace(/\/$/, "");
  updateConnectionIndicator({ ok: true });
}

function requireBaseUrl() {
  if (!state.baseUrl) {
    const message = "Backend connection is not configured.";
    updateConnectionIndicator({ ok: false, message });
    showToast(message, "error");
    throw new Error("Missing base URL");
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
  const url = `${state.baseUrl}${path}`;
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
    const roles = Array.isArray(state.user.roles) ? state.user.roles : [];
    userRoles.textContent = roles.length ? roles.join(", ") : "No roles";
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

async function refreshSession() {
  try {
    const session = await apiRequest({ path: "/auth/session", silent: true });
    state.user = session?.user || null;
    if (state.user) {
      showToast(`Welcome back, ${state.user.displayName || state.user.username}!`, "success");
    }
  } catch (error) {
    state.user = null;
  } finally {
    renderAuthState();
  }
}

function renderMyTime() {
  if (!myTimeEntries) return;
  myTimeEntries.innerHTML = "";

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

  if (!state.userHolidays.length) {
    const item = document.createElement("li");
    item.className = "timeline__item muted";
    item.textContent = "No holiday requests yet.";
    holidayList.appendChild(item);
    return;
  }

  state.userHolidays.forEach((request) => {
    const item = document.createElement("li");
    item.className = "timeline__item";

    const range = document.createElement("p");
    range.innerHTML = `<strong>${formatDateTime(request.startDate)}</strong> → <strong>${formatDateTime(request.endDate)}</strong>`;

    const status = document.createElement("p");
    status.className = "timeline__meta";
    status.textContent = `Status: ${request.status || "pending"}`;

    const reason = document.createElement("p");
    reason.className = "muted";
    reason.textContent = request.reason || "No reason provided.";

    item.append(range, status, reason);

    if (request.managerNote) {
      const note = document.createElement("p");
      note.className = "timeline__meta";
      note.textContent = `Manager note: ${request.managerNote}`;
      item.appendChild(note);
    }

    holidayList.appendChild(item);
  });
}

function updateClockStatus() {
  if (!clockState || !clockMessage) return;

  if (!state.user) {
    clockState.textContent = "Waiting";
    clockState.className = "status-pill status-pill--idle";
    clockMessage.textContent = "Sign in to manage your shift.";
    return;
  }

  if (!state.userEntries.length) {
    clockState.textContent = "Idle";
    clockState.className = "status-pill status-pill--idle";
    clockMessage.textContent = "No recent shifts recorded.";
    return;
  }

  const active = state.userEntries.find((entry) => !entry.end);
  if (active) {
    clockState.textContent = "Active";
    clockState.className = "status-pill status-pill--success";
    clockMessage.textContent = `Clocked in at ${formatDateTime(active.start)}.`;
  } else {
    const latest = state.userEntries[0];
    clockState.textContent = "Completed";
    clockState.className = "status-pill status-pill--idle";
    clockMessage.textContent = latest
      ? `Last shift ended ${formatDateTime(latest.end)}.`
      : "You're clocked out.";
  }
}

function renderAdminTimesheets() {
  if (!adminTimesheetRows) return;
  adminTimesheetRows.innerHTML = "";

  if (!state.adminTimesheets.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "muted";
    cell.textContent = "No entries loaded.";
    row.appendChild(cell);
    adminTimesheetRows.appendChild(row);
    return;
  }

  state.adminTimesheets.forEach((entry) => {
    const row = document.createElement("tr");

    const memberCell = document.createElement("td");
    memberCell.textContent = entry.memberName || entry.memberId || "Unknown";

    const startCell = document.createElement("td");
    startCell.textContent = formatDateTime(entry.start);

    const endCell = document.createElement("td");
    endCell.textContent = formatDateTime(entry.end);

    const durationCell = document.createElement("td");
    durationCell.textContent = formatDuration(entry.start, entry.end);

    const notesCell = document.createElement("td");
    notesCell.textContent = entry.notes || "—";

    row.append(memberCell, startCell, endCell, durationCell, notesCell);
    adminTimesheetRows.appendChild(row);
  });
}

function renderAdminHolidays() {
  if (!adminHolidayList) return;
  adminHolidayList.innerHTML = "";

  if (!state.adminHolidayRequests.length) {
    const item = document.createElement("li");
    item.className = "timeline__item muted";
    item.textContent = "No pending requests.";
    adminHolidayList.appendChild(item);
    return;
  }

  state.adminHolidayRequests.forEach((request) => {
    const item = document.createElement("li");
    item.className = "timeline__item";

    const heading = document.createElement("p");
    heading.innerHTML = `<strong>${request.memberName || request.memberId}</strong> • ${request.requestId || ""}`;

    const range = document.createElement("p");
    range.className = "timeline__meta";
    range.textContent = `${formatDateTime(request.startDate)} → ${formatDateTime(request.endDate)}`;

    const reason = document.createElement("p");
    reason.className = "muted";
    reason.textContent = request.reason || "No reason provided.";

    item.append(heading, range, reason);
    adminHolidayList.appendChild(item);
  });
}

async function refreshMyTime() {
  if (!state.user) return;
  try {
    const entries = await apiRequest({ path: "/timeclock/me/entries" });
    const normalized = Array.isArray(entries)
      ? entries
      : entries?.entries || [];
    state.userEntries = normalized.slice().sort((a, b) => {
      const aTime = a?.start ? new Date(a.start).getTime() : 0;
      const bTime = b?.start ? new Date(b.start).getTime() : 0;
      return bTime - aTime;
    });
    renderMyTime();
    updateClockStatus();
  } catch (error) {
    // handled in apiRequest
  }
}

async function refreshHolidays() {
  if (!state.user) return;
  try {
    const requests = await apiRequest({ path: "/holidays/me" });
    state.userHolidays = Array.isArray(requests)
      ? requests
      : requests?.requests || [];
    renderHolidayRequests();
  } catch (error) {
    // handled in apiRequest
  }
}

async function loadAdminTimesheets() {
  if (!canAccessAdmin()) return;
  try {
    let path = "/admin/timesheets";
    if (state.adminFilters) {
      const params = new URLSearchParams();
      Object.entries(state.adminFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const query = params.toString();
      if (query) path += `?${query}`;
    }
    const data = await apiRequest({ path });
    const entries = Array.isArray(data) ? data : data?.entries || [];
    state.adminTimesheets = entries.slice().sort((a, b) => {
      const aTime = a?.start ? new Date(a.start).getTime() : 0;
      const bTime = b?.start ? new Date(b.start).getTime() : 0;
      return bTime - aTime;
    });
    renderAdminTimesheets();
  } catch (error) {
    // handled globally
  }
}

async function loadAdminHolidays() {
  if (!canAccessAdmin()) return;
  try {
    const data = await apiRequest({ path: "/admin/holidays?status=pending" });
    const requests = Array.isArray(data) ? data : data?.requests || [];
    state.adminHolidayRequests = requests.slice().sort((a, b) => {
      const aTime = a?.startDate ? new Date(a.startDate).getTime() : 0;
      const bTime = b?.startDate ? new Date(b.startDate).getTime() : 0;
      return aTime - bTime;
    });
    renderAdminHolidays();
  } catch (error) {
    // handled globally
  }
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
    logoutButton.addEventListener("click", async () => {
      try {
        await apiRequest({ path: "/auth/logout", method: "POST" });
      } catch (error) {
        // ignore errors here so logout still clears state
      } finally {
        state.user = null;
        renderAuthState();
        showToast("Signed out.", "info");
        switchView("home");
      }
    });
  }

  if (clockInButton) {
    clockInButton.addEventListener("click", async () => {
      if (!state.user) {
        showToast("Sign in before clocking in.", "info");
        return;
      }
      try {
        await apiRequest({ path: "/timeclock/clock-in", method: "POST" });
        showToast("Clocked in.", "success");
        clockState.textContent = "Active";
        clockState.className = "status-pill status-pill--success";
        clockMessage.textContent = "You're currently clocked in.";
        refreshMyTime();
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
        await apiRequest({ path: "/timeclock/clock-out", method: "POST" });
        showToast("Clocked out.", "success");
        clockState.textContent = "Completed";
        clockState.className = "status-pill status-pill--idle";
        clockMessage.textContent = "You're clocked out.";
        refreshMyTime();
      } catch (error) {
        // handled globally
      }
    });
  }

  if (refreshMyTimeButton) {
    refreshMyTimeButton.addEventListener("click", refreshMyTime);
  }

  if (holidayForm) {
    holidayForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.user) {
        showToast("Sign in to request holiday.", "info");
        return;
      }
      const formData = new FormData(holidayForm);
      const payload = {
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        reason: formData.get("reason"),
      };
      try {
        await apiRequest({ path: "/holidays/request", method: "POST", body: payload });
        showToast("Holiday request submitted.", "success");
        holidayForm.reset();
        refreshHolidays();
      } catch (error) {
        // handled globally
      }
    });
  }

  if (refreshHolidaysButton) {
    refreshHolidaysButton.addEventListener("click", refreshHolidays);
  }

  if (adminTimesheetForm) {
    adminTimesheetForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      const formData = new FormData(adminTimesheetForm);
      state.adminFilters = {
        memberId: formData.get("memberId") || undefined,
        from: formData.get("from") || undefined,
        to: formData.get("to") || undefined,
      };
      loadAdminTimesheets();
    });
  }

  if (refreshAdminTimesheets) {
    refreshAdminTimesheets.addEventListener("click", loadAdminTimesheets);
  }

  if (adminModifyHoursForm) {
    adminModifyHoursForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      const formData = new FormData(adminModifyHoursForm);
      const payload = {
        entryId: formData.get("entryId"),
        start: formData.get("start") || undefined,
        end: formData.get("end") || undefined,
        notes: formData.get("notes") || undefined,
      };
      try {
        await apiRequest({
          path: "/admin/timesheets/modify",
          method: "POST",
          body: payload,
        });
        showToast("Timesheet updated.", "success");
        adminModifyHoursForm.reset();
        loadAdminTimesheets();
      } catch (error) {
        // handled globally
      }
    });
  }

  if (refreshAdminHolidays) {
    refreshAdminHolidays.addEventListener("click", loadAdminHolidays);
  }

  if (adminHolidayForm) {
    adminHolidayForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      const formData = new FormData(adminHolidayForm);
      const payload = {
        requestId: formData.get("requestId"),
        status: formData.get("status"),
        managerNote: formData.get("managerNote") || undefined,
      };
      try {
        await apiRequest({
          path: "/admin/holidays/decision",
          method: "POST",
          body: payload,
        });
        showToast("Decision submitted.", "success");
        adminHolidayForm.reset();
        loadAdminHolidays();
      } catch (error) {
        // handled globally
      }
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
      const payload = {
        memberId: formData.get("memberId"),
        roles: (formData.get("roles") || "")
          .split(",")
          .map((role) => role.trim())
          .filter(Boolean),
        action: formData.get("action"),
      };
      try {
        await apiRequest({
          path: "/admin/roles",
          method: "POST",
          body: payload,
        });
        showToast("Roles updated.", "success");
        adminRoleForm.reset();
      } catch (error) {
        // handled globally
      }
    });
  }
}

function initiateLogin() {
  if (!state.baseUrl) {
    showToast("Backend connection is not configured.", "error");
    return;
  }
  const redirectUri = encodeURIComponent(window.location.href);
  const loginUrl = `${state.baseUrl}/auth/discord?redirect_uri=${redirectUri}`;
  window.location.href = loginUrl;
}

function initialize() {
  configureBaseUrl();
  if (!state.baseUrl) {
    showToast("Backend connection is not configured.", "error");
  }
  bindEvents();
  renderAuthState();

  if (state.baseUrl) {
    refreshSession().then(() => {
      if (state.user) {
        switchView("my-time");
      }
    });
  }
}

initialize();
