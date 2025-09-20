const { EmbedBuilder } = require("discord.js");
const { ApiError } = require("../apiClient");
const { createErrorEmbed } = require("../utils/embeds");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#81e6ff";
const ERROR_COLOR = "#FF0000";

async function showBalance(interaction, { api }) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const timesheet = await api.getTimesheet({
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });

    if (!timesheet?.worker) {
      const embed = new EmbedBuilder()
        .setColor(ERROR_COLOR)
        .setDescription("This user isn't a worker here.");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const { metrics, payroll } = timesheet;
    const hourlyRate = payroll?.hourly_rate ?? 0;

    const dailyBalance = formatPay(metrics.daily_hours, hourlyRate);
    const weeklyBalance = formatPay(metrics.weekly_hours, hourlyRate);
    const totalBalance = formatPay(metrics.total_hours, hourlyRate);

    const embed = new EmbedBuilder()
      .setTitle("Your balance")
      .setColor(DEFAULT_COLOR)
      .addFields(
        {
          name: "Today balance:",
          value: codeBlock(`£${dailyBalance}p`),
          inline: true,
        },
        {
          name: "Weekly balance:",
          value: codeBlock(`£${weeklyBalance}p`),
          inline: true,
        },
        {
          name: "Full balance:",
          value: codeBlock(`£${totalBalance}p`),
          inline: true,
        }
      );

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const notFoundEmbed = new EmbedBuilder()
        .setColor(ERROR_COLOR)
        .setDescription("This user isn't a worker here.");

      await interaction.editReply({ embeds: [notFoundEmbed] });
      return;
    }

    const embed = createErrorEmbed(error);
    await interaction.editReply({ embeds: [embed] });
  }
}

function formatPay(hoursWorked, hourlyRate) {
  if (hoursWorked == null || hourlyRate == null) {
    return "0.00";
  }

  const raw = Math.floor(hoursWorked * hourlyRate * 100) / 100;
  return raw.toFixed(2);
}

function codeBlock(text) {
  return `\`\`\`${text}\`\`\``;
}

module.exports = {
  showBalance,
};
