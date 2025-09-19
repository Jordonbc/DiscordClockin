const fetch = require("node-fetch");
const { URL } = require("url");

const baseUrl = process.env.BACKEND_API_URL;
let hasWarnedAboutConfig = false;

function ensureConfigured() {
  if (baseUrl) {
    return true;
  }

  if (!hasWarnedAboutConfig) {
    console.warn(
      "[BackendAPI] BACKEND_API_URL is not configured. Falling back to legacy persistence."
    );
    hasWarnedAboutConfig = true;
  }

  return false;
}

function buildUrl(path) {
  try {
    return new URL(path, baseUrl).toString();
  } catch (error) {
    console.error(
      `[BackendAPI] Failed to construct request URL for path ${path}:`,
      error
    );
    return null;
  }
}

async function post(path, payload) {
  if (!ensureConfigured()) {
    return null;
  }

  const url = buildUrl(path);

  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[BackendAPI] Request to ${url} failed: ${response.status} ${errorText}`
      );
      return null;
    }

    return parseJsonResponse(response, url);
  } catch (error) {
    console.error(`[BackendAPI] Request to ${url} failed:`, error);
    return null;
  }
}

async function get(path) {
  if (!ensureConfigured()) {
    return null;
  }

  const url = buildUrl(path);

  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[BackendAPI] Request to ${url} failed: ${response.status} ${errorText}`
      );
      return null;
    }

    return parseJsonResponse(response, url);
  } catch (error) {
    console.error(`[BackendAPI] Request to ${url} failed:`, error);
    return null;
  }
}

async function parseJsonResponse(response, url) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(
      `[BackendAPI] Failed to parse JSON response from ${url}:`,
      error,
      text
    );
    return null;
  }
}

async function startShift({ guildId, userId, clockInMessageId }) {
  const payload = {
    guild_id: guildId,
    user_id: userId,
  };

  if (clockInMessageId) {
    payload.clock_in_message_id = clockInMessageId;
  }

  return post("/api/v1/shifts/start", payload);
}

async function endShift({ guildId, userId }) {
  return post("/api/v1/shifts/end", {
    guild_id: guildId,
    user_id: userId,
  });
}

async function startBreak({ guildId, userId }) {
  return post("/api/v1/shifts/break/start", {
    guild_id: guildId,
    user_id: userId,
  });
}

async function endBreak({ guildId, userId }) {
  return post("/api/v1/shifts/break/end", {
    guild_id: guildId,
    user_id: userId,
  });
}

async function registerWorker({ guildId, userId, roleId, experience }) {
  const payload = {
    guild_id: guildId,
    user_id: userId,
    role_id: roleId,
  };

  if (experience && experience.toLowerCase() !== "none") {
    payload.experience = experience;
  }

  return post("/api/v1/workers/register", payload);
}

async function getWorker({ guildId, userId }) {
  const data = await get(`/api/v1/workers/${guildId}/${userId}`);

  if (!data) {
    return null;
  }

  return normalizeWorkerView(data);
}

async function listWorkers({ guildId }) {
  const data = await get(`/api/v1/workers/${guildId}`);

  if (!data || !Array.isArray(data.workers)) {
    return null;
  }

  return {
    workers: data.workers.map(normalizeWorkerView),
  };
}

async function getTimesheet({ guildId, userId }) {
  return get(`/api/v1/timesheets/${guildId}/${userId}`);
}

function normalizeWorkerView(worker) {
  if (!worker) {
    return null;
  }

  const clockDates = worker.clock_dates || {};
  const afkDates = worker.afk_dates || {};

  return {
    userId: worker.user_id,
    status: worker.status,
    roleId: worker.role_id,
    experience: worker.experience || null,
    breaksCount: worker.breaks_count ?? 0,
    breakTime: worker.break_time_hours ?? 0,
    worked: worker.worked_hours ?? 0,
    clockInMessage: worker.clock_in_message || null,
    clockDates: {
      clockIn: normalizeEpochArray(clockDates.clock_in),
      clockOut: normalizeEpochArray(clockDates.clock_out),
    },
    afkDates: {
      afkIn: normalizeEpochArray(afkDates.afk_in),
      afkOut: normalizeEpochArray(afkDates.afk_out),
    },
    dailyWorked: worker.daily_worked_hours ?? 0,
    weeklyWorked: worker.weekly_worked_hours ?? 0,
    totalWorked: worker.total_worked_hours ?? 0,
  };
}

function normalizeEpochArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => {
    const numeric = Number(value);

    return Number.isFinite(numeric) ? numeric : value;
  });
}

module.exports = {
  startShift,
  endShift,
  startBreak,
  endBreak,
  registerWorker,
  getWorker,
  listWorkers,
  getTimesheet,
};
