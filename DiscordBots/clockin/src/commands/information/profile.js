const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { createErrorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Display a worker profile")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to inspect")
        .setRequired(false)
    ),
  async execute(interaction, { api }) {
    const target = interaction.options.getUser("user") || interaction.user;

    try {
      const settingsPayload = await api.getSettings({ guildId: interaction.guildId });
      const settings = settingsPayload?.settings;

      if (!canViewTarget(interaction, settings, target.id)) {
        await interaction.reply({
          content: "You don't have permission to view that profile.",
          ephemeral: true,
        });
        return;
      }

      const timesheet = await api.getTimesheet({
        guildId: interaction.guildId,
        userId: target.id,
      });

      const embed = buildProfileEmbed(target, timesheet);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

function canViewTarget(interaction, settings, targetId) {
  if (targetId === interaction.user.id) {
    return true;
  }

  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  const adminRoles = settings?.bot_admin_role || [];
  if (adminRoles.length > 0) {
    const memberRoles = interaction.member.roles.cache;
    if (memberRoles.some((role) => adminRoles.includes(role.id))) {
      return true;
    }
  }

  return false;
}

function buildProfileEmbed(user, timesheet) {
  const worker = timesheet.worker;
  const metrics = timesheet.metrics;
  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle(`${user.username}'s profile`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      {
        name: "Status",
        value: worker.status,
        inline: true,
      },
      {
        name: "Role",
        value: worker.role_id,
        inline: true,
      },
      {
        name: "Experience",
        value: worker.experience || "Not set",
        inline: true,
      },
      {
        name: "Daily worked",
        value: `${metrics.daily_hours.toFixed(2)}h`,
        inline: true,
      },
      {
        name: "Weekly worked",
        value: `${metrics.weekly_hours.toFixed(2)}h`,
        inline: true,
      },
      {
        name: "Total worked",
        value: `${metrics.total_hours.toFixed(2)}h`,
        inline: true,
      }
    )
    .setFooter({ text: user.id })
    .setTimestamp(new Date());

  if (metrics.break_hours) {
    embed.addFields({
      name: "Break time",
      value: `${metrics.break_hours.toFixed(2)}h`,
      inline: true,
    });
  }

  if (timesheet.payroll) {
    embed.addFields({
      name: "Projected pay",
      value: `Hourly: $${timesheet.payroll.hourly_rate.toFixed(2)}\nWeekly: $${timesheet.payroll.projected_weekly_pay.toFixed(2)}\nOverall: $${timesheet.payroll.projected_total_pay.toFixed(2)}`,
      inline: false,
    });
  }

  if (Array.isArray(timesheet.sessions) && timesheet.sessions.length > 0) {
    const latest = timesheet.sessions.slice(-3).reverse();
    const descriptor = latest
      .map((session) => {
        if (session.ended_at_ms) {
          return `• ${formatTimestamp(session.started_at_ms)} → ${formatTimestamp(session.ended_at_ms)} (${session.duration_minutes.toFixed(0)}m)`;
        }
        return `• ${formatTimestamp(session.started_at_ms)} → ongoing (${session.duration_minutes.toFixed(0)}m)`;
      })
      .join("\n");

    embed.addFields({
      name: "Recent sessions",
      value: descriptor,
      inline: false,
    });
  }

  return embed;
}

function formatTimestamp(ms) {
  return `<t:${Math.round(ms / 1000)}:f>`;
}
