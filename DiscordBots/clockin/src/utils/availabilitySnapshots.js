const { buildAvailabilityEmbed } = require("./availabilityEmbeds");

const UPDATE_INTERVAL_MS = 15000;
const STORE_KEY = Symbol("availabilitySnapshots");

function ensureStore(client) {
  if (!client[STORE_KEY]) {
    client[STORE_KEY] = new Map();
  }

  return client[STORE_KEY];
}

function cleanupSnapshot(client, guildId) {
  const store = ensureStore(client);
  const record = store.get(guildId);
  if (!record) {
    return;
  }

  if (record.interval) {
    clearInterval(record.interval);
  }

  store.delete(guildId);
}

function registerAvailabilitySnapshot({ client, guildId, channelId, messageId, api }) {
  if (!client || !guildId || !channelId || !messageId) {
    return;
  }

  const store = ensureStore(client);
  const existing = store.get(guildId);
  if (existing?.interval) {
    clearInterval(existing.interval);
  }

  const record = {
    guildId,
    channelId,
    messageId,
    api,
    interval: null,
    isRefreshing: false,
    pendingRefresh: false,
  };

  record.interval = setInterval(() => {
    refreshAvailabilitySnapshot({ client, guildId, api }).catch((error) => {
      console.warn(
        `Failed to refresh availability snapshot for guild ${guildId}:`,
        error
      );
    });
  }, UPDATE_INTERVAL_MS);

  store.set(guildId, record);
}

async function refreshAvailabilitySnapshot({ client, guildId, api }) {
  if (!client || !guildId) {
    return false;
  }

  const store = ensureStore(client);
  const record = store.get(guildId);
  if (!record) {
    return false;
  }

  if (record.isRefreshing) {
    record.pendingRefresh = true;
    return false;
  }

  const effectiveApi = api || record.api || client.api;
  if (!effectiveApi || typeof effectiveApi.listWorkers !== "function") {
    return false;
  }

  record.isRefreshing = true;
  try {
    const channel = await client.channels.fetch(record.channelId).catch(() => null);
    if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased()) {
      cleanupSnapshot(client, guildId);
      return false;
    }

    const message = await channel.messages.fetch(record.messageId).catch(() => null);
    if (!message) {
      cleanupSnapshot(client, guildId);
      return false;
    }

    const response = await effectiveApi.listWorkers({ guildId });
    const workers = Array.isArray(response?.workers) ? response.workers : [];
    const embed = buildAvailabilityEmbed(message, workers);

    await message.edit({ embeds: [embed] });
    return true;
  } catch (error) {
    if (error?.code === 50001 || error?.code === 10008) {
      cleanupSnapshot(client, guildId);
    }
    throw error;
  } finally {
    record.isRefreshing = false;

    if (record.pendingRefresh) {
      record.pendingRefresh = false;
      setImmediate(() => {
        refreshAvailabilitySnapshot({ client, guildId, api }).catch((err) => {
          console.warn(
            `Failed to run pending availability refresh for guild ${guildId}:`,
            err
          );
        });
      });
    }
  }
}

async function triggerAvailabilityRefresh({ client, guildId, api }) {
  try {
    await refreshAvailabilitySnapshot({ client, guildId, api });
  } catch (error) {
    console.warn(
      `Failed to trigger availability refresh for guild ${guildId}:`,
      error
    );
  }
}

module.exports = {
  registerAvailabilitySnapshot,
  refreshAvailabilitySnapshot,
  triggerAvailabilityRefresh,
};
