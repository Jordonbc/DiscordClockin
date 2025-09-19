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

    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
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
}

module.exports = { ApiClient, ApiError };
