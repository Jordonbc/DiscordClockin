const { EmbedBuilder, time } = require("discord.js");
const { createErrorEmbed } = require("../utils/embeds");
const { notifyUserDm } = require("../utils/dm");
const { resolveGuildName } = require("../utils/interactions");
const { buildClockedOutView } = require("../views/dmShiftControls");
const { triggerAvailabilityRefresh } = require("../utils/availabilitySnapshots");
const { SUMMARY_FIELD_ID } = require("../views/clockOutSummaryModal");
const { buildShiftEmbed } = require("../views/shiftEmbeds");

module.exports = {
  id: "clock_out_summary",
  async execute(interaction, { api }) {
    const { guildId } = parseCustomId(interaction.customId);
    const summaryRaw = interaction.fields.getTextInputValue(SUMMARY_FIELD_ID);
    const summary = summaryRaw ? summaryRaw.trim() : "";

    if (!guildId) {
      await interaction.reply({
        content: "I couldn't tell which server to clock you out from. Try again from your Clockin controls.",
        ephemeral: true,
      });
      return;
    }

    if (!summary) {
      await interaction.reply({
        content: "Please share a short summary of what you worked on before clocking out.",
        ephemeral: true,
      });
      return;
    }

    const inGuild = interaction.inGuild();

    try {
      if (inGuild) {
        await interaction.deferReply({ ephemeral: true });
      } else {
        await interaction.deferReply();
      }

      const userId = interaction.user.id;

      let timesheet = null;
      try {
        timesheet = await api.getTimesheet({ guildId, userId });
      } catch (error) {
        console.warn(
          `Failed to fetch active timesheet for guild ${guildId} before clock out:`,
          error
        );
      }

      const response = await api.endShift({
        guildId,
        userId,
      });

      const guildName = await resolveGuildName(interaction, guildId);
      const dmView = buildClockedOutView({
        guildName,
        totalWorkedHours: response.worker.total_worked_hours,
      });

      if (inGuild) {
        const embed = buildShiftEmbed("Clocked out", response.worker);
        await interaction.editReply({ embeds: [embed] });
        await notifyUserDm(interaction, dmView);
      } else {
        if (interaction.message) {
          await interaction.message.edit(dmView).catch((error) => {
            console.warn(
              `Failed to update DM shift controls for user ${interaction.user.id}:`,
              error
            );
          });
        } else {
          await notifyUserDm(interaction, dmView, { failureMessage: null });
        }

        await interaction.deleteReply().catch(() => {});
      }

      await triggerAvailabilityRefresh({ client: interaction.client, guildId });

      await sendLogEntry({
        interaction,
        api,
        guildId,
        summary,
        timesheet,
        clockOutTimestamp: response.timestamp_ms,
        worker: response.worker,
      });
    } catch (error) {
      const embed = createErrorEmbed(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },
};

async function sendLogEntry({
  interaction,
  api,
  guildId,
  summary,
  timesheet,
  clockOutTimestamp,
  worker,
}) {
  let settings;
  try {
    const settingsPayload = await api.getSettings({ guildId });
    settings = settingsPayload?.settings;
  } catch (error) {
    console.warn(`Failed to load settings for guild ${guildId} while logging clock out:`, error);
    return;
  }

  const logChannelId = settings?.log_channel_id;
  if (!logChannelId) {
    return;
  }

  let channel = null;
  try {
    channel = await interaction.client.channels.fetch(logChannelId);
  } catch (error) {
    console.warn(
      `Failed to fetch log channel ${logChannelId} for guild ${guildId}:`,
      error
    );
    return;
  }

  if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased()) {
    return;
  }

  const embed = buildLogEmbed({
    interaction,
    summary,
    timesheet,
    clockOutTimestamp,
    worker,
  });

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.warn(`Failed to post clock-out log in channel ${logChannelId}:`, error);
  }
}

function buildLogEmbed({ interaction, summary, timesheet, clockOutTimestamp, worker }) {
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTitle("Clock-out summary")
    .setDescription(`<@${interaction.user.id}> clocked out.`)
    .setTimestamp(new Date(clockOutTimestamp || Date.now()));

  const sessionStartMs = resolveSessionStartMs(timesheet, worker);
  if (sessionStartMs) {
    embed.addFields({
      name: "Clocked in",
      value: time(Math.floor(sessionStartMs / 1000), "f"),
      inline: true,
    });
  }

  if (clockOutTimestamp) {
    embed.addFields({
      name: "Clocked out",
      value: time(Math.floor(clockOutTimestamp / 1000), "f"),
      inline: true,
    });
  }

  const breakMinutes = calculateBreakMinutes(timesheet);
  const sessionMinutes = calculateSessionMinutes({
    timesheet,
    sessionStartMs,
    clockOutTimestamp,
    worker,
  });
  const workedMinutes = sessionMinutes !== null ? Math.max(sessionMinutes - breakMinutes, 0) : null;

  if (workedMinutes !== null) {
    embed.addFields({
      name: "Worked time",
      value: formatDuration(workedMinutes),
      inline: true,
    });
  }

  const breaksCount = timesheet?.worker?.breaks_count;
  if (Number.isInteger(breaksCount) || breakMinutes > 0) {
    const breakLabel = `${Number.isInteger(breaksCount) ? breaksCount : 0} (${formatDuration(
      breakMinutes
    )})`;
    embed.addFields({ name: "Breaks", value: breakLabel, inline: true });
  }

  const revenue = calculateSessionRevenue(timesheet, workedMinutes);
  if (revenue !== null) {
    embed.addFields({
      name: "Session revenue",
      value: formatCurrency(revenue),
      inline: true,
    });
  }

  const totalsField = buildTotalsField(worker);
  if (totalsField) {
    embed.addFields(totalsField);
  }

  embed.addFields({ name: "Summary", value: summary });
  return embed;
}

function calculateSessionMinutes({ timesheet, sessionStartMs, clockOutTimestamp, worker }) {
  if (Number.isFinite(timesheet?.active_session?.duration_minutes)) {
    return Math.max(0, Math.round(timesheet.active_session.duration_minutes));
  }

  if (Number.isFinite(sessionStartMs) && Number.isFinite(clockOutTimestamp)) {
    return Math.max(0, Math.round((clockOutTimestamp - sessionStartMs) / 60000));
  }

  const clockIns = worker?.clock_dates?.clock_in;
  const clockOuts = worker?.clock_dates?.clock_out;
  if (Array.isArray(clockIns) && Array.isArray(clockOuts) && clockIns.length === clockOuts.length) {
    const lastIn = Number(clockIns[clockIns.length - 1]);
    const lastOut = Number(clockOuts[clockOuts.length - 1]);
    if (Number.isFinite(lastIn) && Number.isFinite(lastOut)) {
      return Math.max(0, Math.round((lastOut - lastIn) / 60000));
    }
  }

  return null;
}

function calculateBreakMinutes(timesheet) {
  const breakHours = Number(timesheet?.metrics?.break_hours);
  if (!Number.isFinite(breakHours) || breakHours <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(breakHours * 60));
}

function calculateSessionRevenue(timesheet, workedMinutes) {
  if (!Number.isFinite(timesheet?.payroll?.hourly_rate) || workedMinutes === null) {
    return null;
  }

  const hourlyRate = timesheet.payroll.hourly_rate;
  return hourlyRate * (workedMinutes / 60);
}

function buildTotalsField(worker) {
  if (!worker) {
    return null;
  }

  const lines = [];

  if (Number.isFinite(worker.daily_worked_hours)) {
    lines.push(`• Today: ${worker.daily_worked_hours.toFixed(2)}h`);
  }

  if (Number.isFinite(worker.weekly_worked_hours)) {
    lines.push(`• This week: ${worker.weekly_worked_hours.toFixed(2)}h`);
  }

  if (Number.isFinite(worker.total_worked_hours)) {
    lines.push(`• All time: ${worker.total_worked_hours.toFixed(2)}h`);
  }

  if (lines.length === 0) {
    return null;
  }

  return { name: "Hours logged", value: lines.join("\n"), inline: true };
}

function resolveSessionStartMs(timesheet, worker) {
  const activeStart = Number(timesheet?.active_session?.started_at_ms);
  if (Number.isFinite(activeStart) && activeStart > 0) {
    return activeStart;
  }

  const clockIns = timesheet?.worker?.clock_dates?.clock_in || worker?.clock_dates?.clock_in;
  if (Array.isArray(clockIns) && clockIns.length > 0) {
    const last = Number(clockIns[clockIns.length - 1]);
    if (Number.isFinite(last) && last > 0) {
      return last;
    }
  }

  return null;
}

function formatDuration(totalMinutes) {
  const minutes = Math.max(0, Number.isFinite(totalMinutes) ? Math.round(totalMinutes) : 0);
  const hoursPart = Math.floor(minutes / 60);
  const minutesPart = minutes % 60;

  const parts = [];
  if (hoursPart > 0) {
    parts.push(`${hoursPart}h`);
  }
  if (minutesPart > 0 || parts.length === 0) {
    parts.push(`${minutesPart}m`);
  }

  return parts.join(" ");
}

function formatCurrency(amount) {
  if (!Number.isFinite(amount)) {
    return null;
  }

  return `$${amount.toFixed(2)}`;
}

function parseCustomId(customId) {
  if (typeof customId !== "string") {
    return { guildId: null, origin: null };
  }

  const parts = customId.split(":");
  return {
    guildId: parts[1] || null,
    origin: parts[2] || null,
  };
}
