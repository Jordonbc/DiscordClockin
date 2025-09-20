const { EmbedBuilder } = require("discord.js");
const { createErrorEmbed } = require("../utils/embeds");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#00FF00";

async function showBalance(interaction, { api }) {
  try {
    const data = await api.getTimesheet({
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });

    if (!data?.payroll) {
      const embed = new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setDescription("No payroll information is available for you yet.");

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const payroll = data.payroll;
    const embed = new EmbedBuilder()
      .setColor(DEFAULT_COLOR)
      .setTitle("Projected balance")
      .setDescription(
        `Hourly rate: **$${payroll.hourly_rate.toFixed(2)}**\n` +
          `Weekly projection: **$${payroll.projected_weekly_pay.toFixed(2)}**\n` +
          `Total projection: **$${payroll.projected_total_pay.toFixed(2)}**`
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    const embed = createErrorEmbed(error);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

module.exports = {
  showBalance,
};
