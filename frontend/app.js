const state = {
  baseUrl: "",
  stats: {
    total: 0,
    success: 0,
    error: 0,
  },
  recent: [],
  lastResponse: null,
};

const baseUrlForm = document.querySelector("#base-url-form");
const baseUrlInput = document.querySelector("#base-url");
const connectionStatus = document.querySelector("#connection-status");
const logContainer = document.querySelector("#log-container");
const clearLogButton = document.querySelector("#clear-log");
const healthButton = document.querySelector("[data-action='healthcheck']");
const navButtons = Array.from(document.querySelectorAll(".sidebar__link"));
const views = Array.from(document.querySelectorAll(".view"));
const quickActionButtons = document.querySelectorAll("[data-quick-view]");

const statTotal = document.querySelector("#stat-total");
const statSuccess = document.querySelector("#stat-success");
const statError = document.querySelector("#stat-error");
const statusTitle = document.querySelector("#last-response-title");
const statusDetail = document.querySelector("#last-response-status");
const statusTime = document.querySelector("#last-response-time");
const statusPill = document.querySelector("#last-response-pill");
const activityFeed = document.querySelector("#activity-feed");
const liveDate = document.querySelector("#live-date");
const liveTime = document.querySelector("#live-time");

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function startClock() {
  if (!liveDate || !liveTime) {
    return;
  }
  const update = () => {
    const now = new Date();
    liveDate.textContent = dateFormatter.format(now);
    liveTime.textContent = timeFormatter.format(now);
  };
  update();
  setInterval(update, 1000);
}

startClock();

function switchView(target) {
  views.forEach((view) => {
    view.classList.toggle("view--active", view.dataset.view === target);
  });
  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.target === target);
  });
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchView(button.dataset.target);
  });
});

quickActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.getAttribute("data-quick-view");
    if (view) {
      switchView(view);
    }
  });
});

function setBaseUrl(url) {
  state.baseUrl = url.replace(/\/?$/, "");
  baseUrlInput.value = state.baseUrl;
  connectionStatus.textContent = `Connected to ${state.baseUrl}`;
  connectionStatus.classList.remove("connect__status--error");
  connectionStatus.classList.add("connect__status--success");
  appendLog({
    title: "Base URL updated",
    status: "ready",
    ok: true,
    payload: { baseUrl: state.baseUrl },
  });
}

function markDisconnected() {
  connectionStatus.textContent = "Not connected";
  connectionStatus.classList.add("connect__status--error");
  connectionStatus.classList.remove("connect__status--success");
}

function requireBaseUrl() {
  if (!state.baseUrl) {
    markDisconnected();
    const error = new Error("Set the API base URL before making requests.");
    appendLog({
      title: "Missing configuration",
      status: "error",
      ok: false,
      payload: { message: error.message },
    });
    throw error;
  }
}

async function apiRequest({ title, path, method = "GET", body }) {
  requireBaseUrl();

  const requestInit = { method, headers: { Accept: "application/json" } };
  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
    requestInit.headers["Content-Type"] = "application/json";
  }

  const url = `${state.baseUrl}${path}`;

  try {
    const response = await fetch(url, requestInit);
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    appendLog({
      title,
      status: `${response.status} ${response.statusText}`.trim(),
      ok: response.ok,
      payload: data,
    });

    if (!response.ok) {
      const error = new Error(
        typeof data === "string" ? data : data.message || "Request failed",
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (!(error instanceof Error)) {
      const wrapped = new Error("Unexpected error");
      wrapped.data = error;
      error = wrapped;
    }

    appendLog({
      title,
      status: error.status ? `${error.status}` : "error",
      ok: false,
      payload: error.data || { message: error.message },
    });
    throw error;
  }
}

function renderStats() {
  if (statTotal) statTotal.textContent = state.stats.total.toString();
  if (statSuccess) statSuccess.textContent = state.stats.success.toString();
  if (statError) statError.textContent = state.stats.error.toString();
}

function renderLastResponse() {
  if (!statusTitle || !statusDetail || !statusPill || !statusTime) {
    return;
  }

  const entry = state.lastResponse;
  if (!entry) {
    statusTitle.textContent = "Awaiting first request";
    statusDetail.textContent = "Trigger any action to populate this summary.";
    statusTime.textContent = "No activity yet.";
    statusPill.textContent = "Idle";
    statusPill.className = "pill pill--idle";
    return;
  }

  statusTitle.textContent = entry.title;
  statusDetail.textContent = entry.status;
  statusTime.textContent = `Recorded at ${timestampFormatter.format(entry.timestamp)}`;
  statusPill.textContent = entry.ok ? "Operational" : "Attention";
  statusPill.className = `pill ${entry.ok ? "pill--success" : "pill--danger"}`;
}

function renderRecentActivity() {
  if (!activityFeed) {
    return;
  }
  activityFeed.innerHTML = "";

  if (state.recent.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No requests yet. Activity will appear here.";
    activityFeed.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.recent.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "activity-feed__item";

    const header = document.createElement("div");
    header.className = "activity-feed__header";

    const title = document.createElement("span");
    title.textContent = entry.title;

    const time = document.createElement("span");
    time.className = "activity-feed__time";
    time.textContent = timestampFormatter.format(entry.timestamp);

    header.append(title, time);

    const status = document.createElement("span");
    status.textContent = entry.status;
    status.className = "muted";

    item.append(header, status);
    fragment.append(item);
  });

  activityFeed.append(fragment);
}

function updateActivityState(entry) {
  state.stats.total += 1;
  if (entry.ok) {
    state.stats.success += 1;
  } else {
    state.stats.error += 1;
  }
  state.lastResponse = entry;
  state.recent.unshift(entry);
  if (state.recent.length > 5) {
    state.recent.length = 5;
  }
  renderStats();
  renderLastResponse();
  renderRecentActivity();
}

function appendLog({ title, status, ok, payload }) {
  const entry = {
    title,
    status,
    ok,
    payload,
    timestamp: new Date(),
  };

  updateActivityState(entry);

  if (!logContainer) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "log-entry";

  const meta = document.createElement("div");
  meta.className = "log-entry__meta";

  const metaTitle = document.createElement("p");
  metaTitle.className = "log-entry__title";
  metaTitle.textContent = entry.title;

  const metaRight = document.createElement("div");
  metaRight.style.display = "flex";
  metaRight.style.alignItems = "center";
  metaRight.style.gap = "0.5rem";

  const statusChip = document.createElement("span");
  statusChip.className = `log-entry__status ${entry.ok ? "log-entry__status--success" : "log-entry__status--error"}`;
  statusChip.textContent = entry.ok ? "Success" : "Error";

  const timeStamp = document.createElement("span");
  timeStamp.textContent = timestampFormatter.format(entry.timestamp);
  timeStamp.className = "activity-feed__time";

  metaRight.append(statusChip, timeStamp);
  meta.append(metaTitle, metaRight);

  const statusLine = document.createElement("p");
  statusLine.className = "log-entry__status-line";
  statusLine.textContent = entry.status;

  const pre = document.createElement("pre");
  pre.textContent =
    typeof entry.payload === "string"
      ? entry.payload
      : JSON.stringify(entry.payload, null, 2);

  wrapper.append(meta, statusLine, pre);
  logContainer.prepend(wrapper);

  if (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.lastElementChild);
  }
}

baseUrlForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = baseUrlInput.value.trim();
  if (!value) {
    markDisconnected();
    return;
  }
  setBaseUrl(value);
});

clearLogButton.addEventListener("click", () => {
  state.stats = { total: 0, success: 0, error: 0 };
  state.recent = [];
  state.lastResponse = null;
  if (logContainer) {
    logContainer.innerHTML = "";
  }
  renderStats();
  renderLastResponse();
  renderRecentActivity();
});

if (healthButton) {
  healthButton.addEventListener("click", async () => {
    try {
      await apiRequest({ title: "Healthcheck", path: "/health" });
    } catch (_) {}
  });
}

function initializeFromConfig() {
  const config = window.CLOCKIN_FRONTEND_CONFIG || {};
  if (config.apiBaseUrl) {
    setBaseUrl(config.apiBaseUrl);
  } else if (window.location && window.location.origin) {
    const origin = window.location.origin.replace(/\/?$/, "");
    if (origin !== "null") {
      baseUrlInput.placeholder = `${origin}/api`;
    }
  }
}

markDisconnected();
initializeFromConfig();

function parseCommaSeparated(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseHourlySalary(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((acc, line) => {
      const [experience, rate] = line.split(":");
      if (!experience || rate === undefined) {
        return acc;
      }
      const trimmedExperience = experience.trim();
      const parsedRate = Number(rate.trim());
      if (!Number.isFinite(parsedRate)) {
        return acc;
      }
      acc[trimmedExperience] = parsedRate;
      return acc;
    }, {});
}

function getFormValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function attachFormHandler(formSelector, handler) {
  const form = document.querySelector(formSelector);
  if (!form) {
    return;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = getFormValues(form);
    handler(values, form);
  });
}

attachFormHandler("#settings-get-form", async ({ guildId }) => {
  try {
    await apiRequest({
      title: "Fetch settings",
      path: `/guilds/${encodeURIComponent(guildId)}/settings`,
    });
  } catch (_) {}
});

attachFormHandler("#settings-update-form", async (values, form) => {
  const body = {};
  if (values.plan) body.plan = values.plan;
  if (values.logChannelId) body.log_channel_id = values.logChannelId;
  if (values.weeklyReportChannelId)
    body.weekly_report_channel_id = values.weeklyReportChannelId;
  if (values.timeZone) body.time_zone = values.timeZone;
  if (values.targetHours) body.target_hours = Number(values.targetHours);
  if (values.maxAfkHours) body.max_afk_hours = Number(values.maxAfkHours);
  if (values.afkReminders) body.afk_reminders = Number(values.afkReminders);
  if (values.workerVoiceChats)
    body.worker_voice_chats = parseCommaSeparated(values.workerVoiceChats);
  if (values.voiceExemptRole)
    body.voice_exempt_role = parseCommaSeparated(values.voiceExemptRole);
  if (values.botAdminRole)
    body.bot_admin_role = parseCommaSeparated(values.botAdminRole);
  if (values.weeklyExemptRole)
    body.weekly_exempt_role = values.weeklyExemptRole;

  if (Object.keys(body).length === 0) {
    appendLog({
      title: "Update settings",
      status: "no changes",
      ok: false,
      payload: {
        message: "Provide at least one field to update before submitting.",
      },
    });
    return;
  }

  try {
    await apiRequest({
      title: "Update settings",
      path: `/guilds/${encodeURIComponent(values.guildId)}/settings`,
      method: "PATCH",
      body,
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#roles-get-form", async ({ guildId }) => {
  try {
    await apiRequest({
      title: "Fetch roles",
      path: `/guilds/${encodeURIComponent(guildId)}/roles`,
    });
  } catch (_) {}
});

attachFormHandler("#roles-create-form", async (values, form) => {
  const experiences = parseCommaSeparated(values.experiences);
  const hourlySalary = parseHourlySalary(values.hourlySalary);
  const body = {
    guild_id: values.guildId,
    name: values.name,
    category: values.category,
    experiences,
    hourly_salary: hourlySalary,
  };
  if (values.roleId) {
    body.role_id = values.roleId;
  }
  const missingRates = experiences.filter(
    (experience) => hourlySalary[experience] === undefined,
  );
  if (missingRates.length > 0) {
    appendLog({
      title: "Create role",
      status: "validation",
      ok: false,
      payload: {
        message: `Provide hourly salary for: ${missingRates.join(", ")}`,
      },
    });
    return;
  }
  try {
    await apiRequest({
      title: "Create role",
      path: `/guilds/${encodeURIComponent(values.guildId)}/roles`,
      method: "POST",
      body,
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#roles-delete-form", async ({ guildId, roleId }) => {
  try {
    await apiRequest({
      title: "Delete role",
      path: `/guilds/${encodeURIComponent(guildId)}/roles/${encodeURIComponent(roleId)}`,
      method: "DELETE",
    });
  } catch (_) {}
});

attachFormHandler("#roles-add-exp-form", async ({ guildId, name }, form) => {
  try {
    await apiRequest({
      title: "Add experience",
      path: `/guilds/${encodeURIComponent(guildId)}/roles/experiences`,
      method: "POST",
      body: { name },
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler(
  "#roles-remove-exp-form",
  async ({ guildId, experience }, form) => {
    try {
      await apiRequest({
        title: "Remove experience",
        path: `/guilds/${encodeURIComponent(guildId)}/roles/experiences/${encodeURIComponent(experience)}`,
        method: "DELETE",
      });
      form.reset();
    } catch (_) {}
  },
);

attachFormHandler("#worker-register-form", async (values, form) => {
  const body = {
    guild_id: values.guildId,
    user_id: values.userId,
    role_id: values.roleId,
  };
  if (values.experience) {
    body.experience = values.experience;
  }
  try {
    await apiRequest({
      title: "Register worker",
      path: "/workers/register",
      method: "POST",
      body,
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#workers-list-form", async ({ guildId }) => {
  try {
    await apiRequest({
      title: "List workers",
      path: `/workers/${encodeURIComponent(guildId)}`,
    });
  } catch (_) {}
});

attachFormHandler("#worker-get-form", async ({ guildId, userId }) => {
  try {
    await apiRequest({
      title: "Get worker",
      path: `/workers/${encodeURIComponent(guildId)}/${encodeURIComponent(userId)}`,
    });
  } catch (_) {}
});

attachFormHandler("#shift-start-form", async (values, form) => {
  const body = {
    guild_id: values.guildId,
    user_id: values.userId,
  };
  if (values.messageId) {
    body.clock_in_message_id = values.messageId;
  }
  try {
    await apiRequest({
      title: "Clock in",
      path: "/shifts/start",
      method: "POST",
      body,
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#shift-end-form", async (values, form) => {
  try {
    await apiRequest({
      title: "Clock out",
      path: "/shifts/end",
      method: "POST",
      body: {
        guild_id: values.guildId,
        user_id: values.userId,
      },
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#break-start-form", async (values, form) => {
  try {
    await apiRequest({
      title: "Start break",
      path: "/shifts/break/start",
      method: "POST",
      body: {
        guild_id: values.guildId,
        user_id: values.userId,
      },
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#break-end-form", async (values, form) => {
  try {
    await apiRequest({
      title: "End break",
      path: "/shifts/break/end",
      method: "POST",
      body: {
        guild_id: values.guildId,
        user_id: values.userId,
      },
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#timesheet-get-form", async ({ guildId, userId }) => {
  try {
    await apiRequest({
      title: "Get timesheet",
      path: `/timesheets/${encodeURIComponent(guildId)}/${encodeURIComponent(userId)}`,
    });
  } catch (_) {}
});

attachFormHandler("#hours-add-form", async (values, form) => {
  try {
    await apiRequest({
      title: "Add hours",
      path: "/workers/hours/add",
      method: "POST",
      body: {
        guild_id: values.guildId,
        user_id: values.userId,
        hours: Number(values.hours),
        scope: values.scope,
      },
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#hours-remove-form", async (values, form) => {
  try {
    await apiRequest({
      title: "Remove hours",
      path: "/workers/hours/remove",
      method: "POST",
      body: {
        guild_id: values.guildId,
        user_id: values.userId,
        hours: Number(values.hours),
        scope: values.scope,
      },
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#worker-change-role-form", async (values, form) => {
  try {
    await apiRequest({
      title: "Change worker role",
      path: "/workers/change-role",
      method: "POST",
      body: {
        guild_id: values.guildId,
        user_id: values.userId,
        role_id: values.roleId,
        experience: values.experience,
      },
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#worker-delete-form", async ({ guildId, userId }, form) => {
  try {
    await apiRequest({
      title: "Delete worker",
      path: `/workers/${encodeURIComponent(guildId)}/${encodeURIComponent(userId)}`,
      method: "DELETE",
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#workers-delete-all-form", async ({ guildId }, form) => {
  try {
    await apiRequest({
      title: "Delete all workers",
      path: `/guilds/${encodeURIComponent(guildId)}/workers`,
      method: "DELETE",
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#roles-delete-all-form", async ({ guildId }, form) => {
  try {
    await apiRequest({
      title: "Delete all roles",
      path: `/guilds/${encodeURIComponent(guildId)}/roles`,
      method: "DELETE",
    });
    form.reset();
  } catch (_) {}
});

attachFormHandler("#guild-delete-all-form", async ({ guildId }, form) => {
  try {
    await apiRequest({
      title: "Purge guild data",
      path: `/guilds/${encodeURIComponent(guildId)}/data`,
      method: "DELETE",
    });
    form.reset();
  } catch (_) {}
});

renderStats();
renderLastResponse();
renderRecentActivity();
