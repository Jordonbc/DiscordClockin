const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { ApiError } = require("../../apiClient");
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

      const [timesheet, roles] = await Promise.all([
        api.getTimesheet({
          guildId: interaction.guildId,
          userId: target.id,
        }),
        api.getRoles({ guildId: interaction.guildId }).catch(() => null),
      ]);

      const embed = buildProfileEmbed(target, timesheet, roles);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        const notFound = new EmbedBuilder()
          .setColor("#FF0000")
          .setDescription("This user isn't a worker here.");

        await interaction.reply({ embeds: [notFound], ephemeral: true });
        return;
      }

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

function buildProfileEmbed(user, timesheet, roles) {
  const worker = timesheet.worker;
  const metrics = timesheet.metrics || {};
  const role = Array.isArray(roles)
    ? roles.find((r) => r.id === worker.role_id)
    : null;

  const hourlyRate = resolveHourlyRate(timesheet, role, worker.experience);
  const weeklyHours = typeof metrics.weekly_hours === "number" ? metrics.weekly_hours : 0;
  const weeklySalary = Math.floor(weeklyHours * hourlyRate * 100) / 100;

  const tag = user.tag || `${user.username}`;
  const embed = new EmbedBuilder()
    .setColor("#81e6ff")
    .setTitle(`${tag}'s Profile`)
    .addFields(
      {
        name: "Role:",
        value: codeBlock(
          `${worker.experience ? `${worker.experience} ` : ""}${
            role?.name || "No role found"
          }`
        ),
        inline: true,
      },
      {
        name: "Status:",
        value: codeBlock(worker.status || "Unknown"),
        inline: true,
      },
      {
        name: "Balance:",
        value: codeBlock(`£${weeklySalary.toFixed(2)}p`),
        inline: true,
      },
      {
        name: "Department:",
        value: codeBlock(role?.category || "No department set"),
        inline: false,
      },
      {
        name: "Today worked:",
        value: codeBlock(formatDuration(metrics.daily_hours)),
        inline: true,
      },
      {
        name: "This week worked:",
        value: codeBlock(formatDuration(metrics.weekly_hours)),
        inline: true,
      },
      {
        name: "Total worked:",
        value: codeBlock(formatDuration(metrics.total_hours)),
        inline: true,
      }
    )
    .setFooter({ text: user.id });

  return embed;
}

function resolveHourlyRate(timesheet, role, experience) {
  const payrollRate = timesheet?.payroll?.hourly_rate;
  if (typeof payrollRate === "number") {
    return payrollRate;
  }

  if (role?.hourly_salary) {
    if (experience) {
      const experienceLower = experience.toLowerCase();
      const matchedEntry = Object.entries(role.hourly_salary).find(
        ([key]) => key.toLowerCase() === experienceLower
      );

      if (matchedEntry && typeof matchedEntry[1] === "number") {
        return matchedEntry[1];
      }
    }

    const firstRate = Object.values(role.hourly_salary)[0];
    if (typeof firstRate === "number") {
      return firstRate;
    }
  }

  return 0;
}

function formatDuration(hours) {
  if (!hours || Number.isNaN(hours)) {
    return "0h 0m";
  }

  const wholeHours = Math.floor(hours);
  const minutes = Math.floor((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

function codeBlock(text) {
  return `\`\`\`${text}\`\`\``;
}
