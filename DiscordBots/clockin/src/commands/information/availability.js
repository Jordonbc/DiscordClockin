const { SlashCommandBuilder, EmbedBuilder, time } = require("discord.js");
const { ApiError } = require("../../apiClient");
const { createErrorEmbed, applyInteractionBranding } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("availability")
    .setDescription("Inspect workforce availability from the backend")
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Summarise worker statuses for this guild")
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("View a worker's detailed availability")
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

    try {
      if (subcommand === "list") {
        const response = await api.listWorkers({ guildId });
        const workers = Array.isArray(response?.workers) ? response.workers : [];
        const embed = buildAvailabilityEmbed(interaction, workers);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      if (subcommand === "status") {
        const target = interaction.options.getUser("user") || interaction.user;
        const data = await api.getTimesheet({ guildId, userId: target.id });
        const embed = buildWorkerStatusEmbed(interaction, target, data);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      await interaction.reply({
        content: "Unsupported subcommand.",
        ephemeral: true,
      });
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

function buildAvailabilityEmbed(interaction, workers) {
  if (!workers || workers.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle("Availability snapshot")
      .setDescription("No workers registered for this guild yet.")
      .setTimestamp(new Date());

    return applyInteractionBranding(embed, interaction);
  }

  const grouped = workers.reduce((acc, worker) => {
    const status = worker.status || "Unknown";
    if (!acc[status]) {
      acc[status] = [];
    }

    acc[status].push(`<@${worker.user_id}>`);
    return acc;
  }, {});

  const fields = Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([status, users]) => ({
      name: `${status} (${users.length})`,
      value: users.slice(0, 15).join(", ") || "—",
    }));

  const embed = new EmbedBuilder()
    .setTitle(
      `Availability snapshot for ${interaction.guild?.name || "this guild"}`
    )
    .setDescription(`Backend contains **${workers.length}** registered workers.`)
    .setTimestamp(new Date());

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return applyInteractionBranding(embed, interaction);
}

function buildWorkerStatusEmbed(interaction, user, data) {
  const worker = data.worker || {};
  const embed = new EmbedBuilder()
    .setTitle(`Availability for ${user.username}`)
    .setDescription(`Current status: **${worker.status || "Unknown"}**`)
    .addFields(
      {
        name: "Breaks taken",
        value: `${worker.breaks_count ?? 0}`,
        inline: true,
      },
      {
        name: "Break hours",
        value: formatNumber(worker.break_time_hours),
        inline: true,
      },
      {
        name: "Total hours",
        value: formatNumber(worker.total_worked_hours),
        inline: true,
      }
    )
    .setTimestamp(new Date());

  if (data.active_session) {
    embed.addFields({
      name: "Active session",
      value: `${formatNumber(data.active_session.duration_minutes, 0)} minutes so far (started ${time(
        Math.round(data.active_session.started_at_ms / 1000)
      )})`,
    });
  }

  if (Array.isArray(data.sessions) && data.sessions.length > 0) {
    const lastSession = data.sessions[data.sessions.length - 1];
    if (lastSession) {
      const duration = formatNumber(lastSession.duration_minutes, 0);
      if (lastSession.ended_at_ms) {
        embed.addFields({
          name: "Last session",
          value: `${time(Math.round(lastSession.started_at_ms / 1000))} → ${time(
            Math.round(lastSession.ended_at_ms / 1000)
          )} (${duration}m)`,
        });
      } else {
        embed.addFields({
          name: "Last session",
          value: `${time(Math.round(lastSession.started_at_ms / 1000))} → ongoing (${duration}m)`,
        });
      }
    }
  }

  return applyInteractionBranding(embed, interaction);
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
