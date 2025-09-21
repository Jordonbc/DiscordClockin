const { SlashCommandBuilder, EmbedBuilder, time } = require("discord.js");
const { ApiError } = require("../../apiClient");
const { createErrorEmbed, applyInteractionBranding } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timesheet")
    .setDescription("Generate timesheet reports using the backend API")
    .addSubcommand((sub) =>
      sub
        .setName("summary")
        .setDescription("Show a worker's hour summary")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Worker to inspect (defaults to you)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("sessions")
        .setDescription("List the most recent work sessions")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Worker to inspect (defaults to you)")
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName("count")
            .setDescription("Number of sessions to display (default 5)")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("payroll")
        .setDescription("Estimate payroll totals for a worker")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Worker to inspect (defaults to you)")
            .setRequired(false)
        )
    ),
  async execute(interaction, { api }) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: "This command can only be used inside a guild.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser("user") || interaction.user;

    try {
      const data = await api.getTimesheet({ guildId, userId: target.id });
      let embed;

      if (subcommand === "summary") {
        embed = buildSummaryEmbed(interaction, target, data);
      } else if (subcommand === "sessions") {
        const count = interaction.options.getInteger("count") || 5;
        embed = buildSessionsEmbed(interaction, target, data, count);
      } else if (subcommand === "payroll") {
        embed = buildPayrollEmbed(interaction, target, data);
      } else {
        await interaction.reply({
          content: "Unsupported subcommand.",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        const embed = applyInteractionBranding(
          new EmbedBuilder()
            .setTitle("Worker not registered")
            .setDescription("That worker isn't registered with the backend yet."),
          interaction
        );
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const embed = createErrorEmbed(error);
      await safeReply(interaction, embed);
    }
  },
};

function buildSummaryEmbed(interaction, user, data) {
  const worker = data.worker || {};
  const metrics = data.metrics || {};
  const embed = new EmbedBuilder()
    .setTitle(`Timesheet summary for ${user.username}`)
    .setDescription(`Current status: **${worker.status || "Unknown"}**`)
    .addFields(
      { name: "Daily hours", value: formatNumber(metrics.daily_hours), inline: true },
      { name: "Weekly hours", value: formatNumber(metrics.weekly_hours), inline: true },
      { name: "Total hours", value: formatNumber(metrics.total_hours), inline: true },
      { name: "Break hours", value: formatNumber(metrics.break_hours), inline: true },
      {
        name: "Active session",
        value: data.active_session
          ? `${formatNumber(data.active_session.duration_minutes, 0)} minutes so far (started ${time(
              Math.round(data.active_session.started_at_ms / 1000)
            )})`
          : "No active session",
        inline: false,
      }
    )
    .setTimestamp(new Date());

  return applyInteractionBranding(embed, interaction);
}

function buildSessionsEmbed(interaction, user, data, count) {
  const embed = new EmbedBuilder()
    .setTitle(`Recent sessions for ${user.username}`)
    .setDescription(`Showing the last ${count} entries (if available).`)
    .setTimestamp(new Date());

  if (!Array.isArray(data.sessions) || data.sessions.length === 0) {
    embed.addFields({ name: "Sessions", value: "No sessions recorded." });
    return applyInteractionBranding(embed, interaction);
  }

  const lines = data.sessions
    .slice(-count)
    .reverse()
    .map((session, index) => formatSessionLine(session, index));

  embed.addFields({ name: "Sessions", value: lines.join("\n") });
  return applyInteractionBranding(embed, interaction);
}

function buildPayrollEmbed(interaction, user, data) {
  const worker = data.worker || {};
  const metrics = data.metrics || {};
  const embed = new EmbedBuilder()
    .setTitle(`Payroll estimate for ${user.username}`)
    .setTimestamp(new Date());

  if (!data.payroll) {
    embed
      .setDescription("No payroll configuration found for this worker.")
      .addFields({ name: "Status", value: worker.status || "Unknown", inline: true });
    return applyInteractionBranding(embed, interaction);
  }

  embed
    .setDescription(`Role: **${worker.role_id || "Not set"}**`)
    .addFields(
      { name: "Experience", value: worker.experience || "Not set", inline: true },
      { name: "Hourly rate", value: `$${formatNumber(data.payroll.hourly_rate)}`, inline: true },
      {
        name: "Projected weekly pay",
        value: `$${formatNumber(data.payroll.projected_weekly_pay)}`,
        inline: true,
      },
      {
        name: "Projected total pay",
        value: `$${formatNumber(data.payroll.projected_total_pay)}`,
        inline: true,
      },
      { name: "Total hours", value: formatNumber(metrics.total_hours), inline: true }
    );

  return applyInteractionBranding(embed, interaction);
}

function formatSessionLine(session, index) {
  if (!session || typeof session.started_at_ms !== "number") {
    return `${index + 1}. Unknown session`;
  }

  const start = time(Math.round(session.started_at_ms / 1000));
  const duration = formatNumber(session.duration_minutes, 0);

  if (session.ended_at_ms) {
    const end = time(Math.round(session.ended_at_ms / 1000));
    return `${index + 1}. ${start} → ${end} (${duration}m)`;
  }

  return `${index + 1}. ${start} → ongoing (${duration}m)`;
}

function formatNumber(value, fractionDigits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(fractionDigits)
    : (0).toFixed(fractionDigits);
}

async function safeReply(interaction, embed) {
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ embeds: [embed], ephemeral: true });
    return;
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
