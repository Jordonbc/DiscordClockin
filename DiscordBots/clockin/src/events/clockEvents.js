const fetch = require("node-fetch");
const readline = require("readline");
const { EmbedBuilder } = require("discord.js");

const { triggerAvailabilityRefresh } = require("../utils/availabilitySnapshots");
const { buildClockedInView, buildClockedOutView } = require("../views/dmShiftControls");

const RECONNECT_DELAY_MS = 5000;
const SETTINGS_TTL_MS = 60_000;
const settingsCache = new Map();

function startClockEventStream(client) {
  const baseUrl = client?.api?.baseUrl;
  if (!baseUrl) {
    console.warn("Clock event stream disabled: missing backend base URL");
    return () => {};
  }

  const guildIdFilter = process.env.GUILD_ID || null;
  let reconnectTimer = null;
  let stopped = false;
  let activeAbortController = null;

  const connect = async () => {
    if (stopped) {
      return;
    }

    const url = new URL("events/stream", baseUrl);
    if (guildIdFilter) {
      url.searchParams.set("guild_id", guildIdFilter);
    }
    url.searchParams.set("event", "clock_in,clock_out");

    activeAbortController = new AbortController();

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "text/event-stream" },
        signal: activeAbortController.signal,
      });

      if (!response.ok || !response.body) {
        let details = "";
        try {
          details = await response.text();
        } catch (error) {
          details = error?.message || "";
        }
        throw new Error(`Unexpected hook response: ${response.status} ${details}`);
      }

      await consumeStream(client, response.body);
    } catch (error) {
      if (!stopped) {
        console.warn("Clock event stream disconnected:", error.message || error);
      }
    } finally {
      activeAbortController = null;
      if (!stopped) {
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    }
  };

  connect().catch((error) => {
    console.warn("Failed to establish clock event stream:", error.message || error);
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
  });

  return () => {
    stopped = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    if (activeAbortController) {
      activeAbortController.abort();
    }
  };
}

function consumeStream(client, stream) {
  return new Promise((resolve) => {
    const reader = readline.createInterface({ input: stream });
    let buffer = "";

    const flush = () => {
      if (!buffer) {
        return;
      }
      try {
        const payload = JSON.parse(buffer);
        handleHookEvent(client, payload);
      } catch (error) {
        console.warn("Failed to handle hook payload:", error.message || error);
      } finally {
        buffer = "";
      }
    };

    reader.on("line", (line) => {
      if (line.startsWith("data:")) {
        buffer += line.slice(5).trimStart();
      } else if (line.trim() === "") {
        flush();
      }
    });

    reader.on("close", () => {
      flush();
      resolve();
    });
    stream.on("error", (error) => {
      console.warn("Clock event stream errored:", error.message || error);
      flush();
      reader.close();
      resolve();
    });
  });
}

async function handleHookEvent(client, event) {
  if (!event || typeof event !== "object") {
    return;
  }

  if (event.source === "discord_bot") {
    return;
  }

  const action = typeof event.action === "string" ? event.action.toLowerCase() : "";

  switch (action) {
    case "clock_in":
      await handleClockInEvent(client, event);
      break;
    case "clock_out":
      await handleClockOutEvent(client, event);
      break;
    default:
      break;
  }
}

async function handleClockInEvent(client, event) {
  const user = await fetchUser(client, event.user_id);
  if (!user) {
    return;
  }

  const guildName = await resolveGuildName(client, event.guild_id);
  const view = buildClockedInView({
    guildName,
    guildId: event.guild_id,
    worker: event.worker,
  });

  await sendDirectMessage(user, view);
  await triggerAvailabilityRefresh({ client, guildId: event.guild_id, api: client.api });
}

async function handleClockOutEvent(client, event) {
  const user = await fetchUser(client, event.user_id);
  if (user) {
    const guildName = await resolveGuildName(client, event.guild_id);
    const view = buildClockedOutView({
      guildName,
      totalWorkedHours: Number(event.worker?.total_worked_hours) || null,
    });
    if (event.summary) {
      view.content = `Summary: ${truncate(event.summary, 1800)}`;
    }
    await sendDirectMessage(user, view);
  }

  await postClockOutLog(client, event);
  await triggerAvailabilityRefresh({ client, guildId: event.guild_id, api: client.api });
}

async function fetchUser(client, userId) {
  if (!userId) {
    return null;
  }
  try {
    return await client.users.fetch(userId);
  } catch (error) {
    console.warn(`Unable to fetch user ${userId} for hook notification`, error);
    return null;
  }
}

async function resolveGuildName(client, guildId) {
  if (!guildId) {
    return "your server";
  }

  const cached = client.guilds.cache.get(guildId);
  if (cached) {
    return cached.name;
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    return guild?.name || guildId;
  } catch (error) {
    return guildId;
  }
}

async function sendDirectMessage(user, payload) {
  if (!user || typeof user.send !== "function") {
    return;
  }

  try {
    await user.send(payload);
  } catch (error) {
    if (error?.code !== 50007) {
      console.warn(`Failed to deliver hook notification to user ${user.id}`, error);
    }
  }
}

async function postClockOutLog(client, event) {
  const settings = await getGuildSettings(client, event.guild_id);
  const logChannelId = settings?.log_channel_id;
  if (!logChannelId) {
    return;
  }

  const channel = await client.channels.fetch(logChannelId).catch(() => null);
  if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased()) {
    return;
  }

  const embed = buildClockOutEmbed(event);
  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.warn(`Failed to publish clock-out log in channel ${logChannelId}`, error);
  }
}

function buildClockOutEmbed(event) {
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("Clock-out recorded")
    .setDescription(`<@${event.user_id}> clocked out.`)
    .setTimestamp(new Date(event.timestamp_ms || Date.now()));

  const summary = typeof event.summary === "string" ? event.summary.trim() : "";
  if (summary) {
    embed.addFields({ name: "Summary", value: truncate(summary, 1024) });
  }

  const clockIns = Array.isArray(event.worker?.clock_dates?.clock_in)
    ? event.worker.clock_dates.clock_in
    : [];
  const clockOuts = Array.isArray(event.worker?.clock_dates?.clock_out)
    ? event.worker.clock_dates.clock_out
    : [];

  const startedAt = clockIns.length ? Number(clockIns[clockIns.length - 1]) : null;
  const endedAt = clockOuts.length ? Number(clockOuts[clockOuts.length - 1]) : null;

  if (Number.isFinite(startedAt)) {
    embed.addFields({
      name: "Clocked in",
      value: formatTimestamp(startedAt),
      inline: true,
    });
  }

  if (Number.isFinite(endedAt)) {
    embed.addFields({
      name: "Clocked out",
      value: formatTimestamp(endedAt),
      inline: true,
    });
  }

  return embed;
}

function formatTimestamp(value) {
  const seconds = Math.floor(Number(value) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "unknown";
  }
  return `<t:${seconds}:f> (<t:${seconds}:R>)`;
}

function truncate(text, maxLength) {
  if (typeof text !== "string") {
    return text;
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

async function getGuildSettings(client, guildId) {
  if (!guildId) {
    return null;
  }

  const now = Date.now();
  const cached = settingsCache.get(guildId);
  if (cached && cached.expires > now) {
    return cached.settings;
  }

  try {
    const payload = await client.api.getSettings({ guildId });
    const settings = payload?.settings || null;
    settingsCache.set(guildId, { settings, expires: now + SETTINGS_TTL_MS });
    return settings;
  } catch (error) {
    console.warn(`Failed to fetch guild settings for ${guildId}`, error);
    return null;
  }
}

module.exports = {
  startClockEventStream,
};
