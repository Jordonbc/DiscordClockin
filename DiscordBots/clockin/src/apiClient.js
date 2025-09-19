const fetch = require("node-fetch");

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ApiClient {
  constructor(baseUrl, { timeoutMs = 10000 } = {}) {
    if (!baseUrl) {
      throw new Error("BACKEND_API_URL is required");
    }

    this.baseUrl = this.#normalizeBaseUrl(baseUrl);
    this.timeoutMs = timeoutMs;
  }

  async startShift({ guildId, userId, clockInMessageId = null }) {
    return this.#postJson("shifts/start", {
      guild_id: guildId,
      user_id: userId,
      clock_in_message_id: clockInMessageId,
    });
  }

  async endShift({ guildId, userId }) {
    return this.#postJson("shifts/end", {
      guild_id: guildId,
      user_id: userId,
    });
  }

  async startBreak({ guildId, userId }) {
    return this.#postJson("shifts/break/start", {
      guild_id: guildId,
      user_id: userId,
    });
  }

  async endBreak({ guildId, userId }) {
    return this.#postJson("shifts/break/end", {
      guild_id: guildId,
      user_id: userId,
    });
  }

  async registerWorker({ guildId, userId, roleId, experience }) {
    return this.#postJson("workers/register", {
      guild_id: guildId,
      user_id: userId,
      role_id: roleId,
      experience: experience || null,
    });
  }

  async getWorker({ guildId, userId }) {
    return this.#getJson(`workers/${encodeURIComponent(guildId)}/${encodeURIComponent(userId)}`);
  }

  async listWorkers({ guildId }) {
    return this.#getJson(`workers/${encodeURIComponent(guildId)}`);
  }

  async getTimesheet({ guildId, userId }) {
    return this.#getJson(
      `timesheets/${encodeURIComponent(guildId)}/${encodeURIComponent(userId)}`
    );
  }

  async getSettings({ guildId }) {
    return this.#getJson(`guilds/${encodeURIComponent(guildId)}/settings`);
  }

  async updateSettings({ guildId, updates }) {
    const payload = await this.#patchJson(
      `guilds/${encodeURIComponent(guildId)}/settings`,
      updates
    );
    return payload?.settings;
  }

  async getRoles({ guildId }) {
    const payload = await this.#getJson(`guilds/${encodeURIComponent(guildId)}/roles`);
    return payload?.roles;
  }

  async createRole({ guildId, name, category, hourlySalary, experiences, roleId }) {
    const payload = await this.#postJson(`guilds/${encodeURIComponent(guildId)}/roles`, {
      name,
      category,
      hourly_salary: hourlySalary,
      experiences,
      role_id: roleId || undefined,
    });
    return payload;
  }

  async deleteRole({ guildId, roleId }) {
    return this.#request(
      `guilds/${encodeURIComponent(guildId)}/roles/${encodeURIComponent(roleId)}`,
      { method: "DELETE" }
    );
  }

  async addExperience({ guildId, name }) {
    return this.#postJson(`guilds/${encodeURIComponent(guildId)}/roles/experiences`, {
      name,
    });
  }

  async removeExperience({ guildId, name }) {
    return this.#request(
      `guilds/${encodeURIComponent(guildId)}/roles/experiences/${encodeURIComponent(name)}`,
      { method: "DELETE" }
    );
  }

  async addHours({ guildId, userId, hours, scope }) {
    return this.#postJson("workers/hours/add", {
      guild_id: guildId,
      user_id: userId,
      hours,
      scope,
    });
  }

  async removeHours({ guildId, userId, hours, scope }) {
    return this.#postJson("workers/hours/remove", {
      guild_id: guildId,
      user_id: userId,
      hours,
      scope,
    });
  }

  async changeWorkerRole({ guildId, userId, roleId, experience }) {
    return this.#postJson("workers/change-role", {
      guild_id: guildId,
      user_id: userId,
      role_id: roleId,
      experience,
    });
  }

  async deleteWorker({ guildId, userId }) {
    return this.#request(
      `workers/${encodeURIComponent(guildId)}/${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
  }

  async deleteAllWorkers({ guildId }) {
    return this.#request(`guilds/${encodeURIComponent(guildId)}/workers`, {
      method: "DELETE",
    });
  }

  async deleteAllRoles({ guildId }) {
    return this.#request(`guilds/${encodeURIComponent(guildId)}/roles`, {
      method: "DELETE",
    });
  }

  async deleteAllData({ guildId }) {
    return this.#request(`guilds/${encodeURIComponent(guildId)}/data`, {
      method: "DELETE",
    });
  }

  async #getJson(path) {
    return this.#request(path, { method: "GET" });
  }

  async #postJson(path, body) {
    return this.#request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  async #patchJson(path, body) {
    return this.#request(path, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  async #request(path, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(new URL(path, this.baseUrl), {
        ...options,
        signal: controller.signal,
      });

      const text = await response.text();
      const payload = text ? this.#safeJsonParse(text) : undefined;

      if (!response.ok) {
        const errorPayload = payload && typeof payload === "object" ? payload.error : undefined;
        const message = errorPayload?.message || payload?.message || response.statusText;
        const code = errorPayload?.code;
        throw new ApiError(response.status, code, message, payload);
      }

      return payload;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new ApiError(408, "timeout", "The request to the backend timed out");
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, "network_error", error.message || "Unknown network error");
    } finally {
      clearTimeout(timeout);
    }
  }

  #safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return { message: text };
    }
  }

  #normalizeBaseUrl(baseUrl) {
    let url;
    try {
      url = new URL(baseUrl);
    } catch (error) {
      throw new Error("BACKEND_API_URL must be a valid URL");
    }

    let pathname = url.pathname || "/";
    const hasApiVersion = /\/api\/v\d+(?:\/|$)/i.test(pathname);
    const endsWithApi = /\/api\/?$/i.test(pathname);
    const isRootPath = pathname === "/" || pathname === "";

    if (hasApiVersion) {
      if (!pathname.endsWith("/")) {
        pathname = `${pathname}/`;
      }
    } else if (isRootPath) {
      pathname = "/api/v1/";
    } else if (endsWithApi) {
      pathname = pathname.replace(/\/api\/?$/i, "/api/v1/");
    } else if (!pathname.endsWith("/")) {
      pathname = `${pathname}/`;
    }

    url.pathname = pathname;
    return url.toString();
  }
}

module.exports = { ApiClient, ApiError };
