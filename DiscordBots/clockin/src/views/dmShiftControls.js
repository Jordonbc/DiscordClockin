const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#5865F2";

function buildClockedInView({ guildName, guildId, worker }) {
  const embed = new EmbedBuilder()
    .setColor(DEFAULT_COLOR)
    .setTitle("YOU'RE CLOCKED IN")
    .setDescription(
      `Shift in progress for **${guildName}**. Use the buttons below when you need to pause or wrap up.`
    );

  const sessionField = buildSessionField(worker);
  if (sessionField) {
    embed.addFields(sessionField);
  }

  const totalsField = buildTotalsField(worker);
  if (totalsField) {
    embed.addFields(totalsField);
  }

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`clock_break:${guildId}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⏸️")
          .setLabel("Take a break"),
        new ButtonBuilder()
          .setCustomId(`clock_out:${guildId}`)
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🛑")
          .setLabel("Clock out")
      ),
    ],
  };
}

function buildSessionField(worker) {
  if (!worker) {
    return null;
  }

  const clockIns = worker.clock_dates?.clock_in;
  const latestClockIn = Array.isArray(clockIns) ? clockIns[clockIns.length - 1] : null;

  if (!latestClockIn) {
    return null;
  }

  const now = Date.now();
  const breakMinutes = Math.max(
    0,
    Math.round((Number(worker.break_time_hours) || 0) * 60)
  );
  const sessionMinutes = Math.max(
    0,
    Math.round((now - latestClockIn) / 60000) - breakMinutes
  );

  const lines = [
    `• Shift started ${formatTimestamp(latestClockIn, "f")} (${formatTimestamp(
      latestClockIn,
      "R"
    )})`,
    `• Time on shift: ${formatDuration(sessionMinutes)}`,
  ];

  const breaksTaken = Number.isInteger(worker.breaks_count)
    ? worker.breaks_count
    : null;
  if (breaksTaken !== null) {
    const breakDuration = formatDuration(breakMinutes);
    lines.push(`• Breaks taken: ${breaksTaken} (${breakDuration})`);
  }

  return {
    name: "Current session",
    value: lines.join("\n"),
  };
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

  return {
    name: "Logged hours",
    value: lines.join("\n"),
  };
}

function formatTimestamp(timestampMs, style) {
  const seconds = Math.floor(Number(timestampMs) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "unknown";
  }
  return `<t:${seconds}:${style}>`;
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

function buildOnBreakView({ guildName, guildId }) {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setTitle("Break in progress")
        .setDescription(
          `You're on break for **${guildName}**. I'll keep the timer paused until you tap **Return to work**.`
        ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`clock_break_end:${guildId}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji("▶️")
          .setLabel("Return to work"),
        new ButtonBuilder()
          .setCustomId(`clock_out:${guildId}`)
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🛑")
          .setLabel("Clock out")
      ),
    ],
  };
}

function buildClockedOutView({ guildName, totalWorkedHours }) {
  const description = totalWorkedHours
    ? `You're clocked out from **${guildName}** with ${totalWorkedHours.toFixed(2)}h logged. Nice work today!`
    : `You're clocked out from **${guildName}**. Nice work today!`;

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setTitle("Clocked out")
        .setDescription(description),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("clock_break_disabled")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Take a break")
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("clock_out_disabled")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Clock out")
          .setDisabled(true)
      ),
    ],
  };
}

module.exports = {
  buildClockedInView,
  buildOnBreakView,
  buildClockedOutView,
};
