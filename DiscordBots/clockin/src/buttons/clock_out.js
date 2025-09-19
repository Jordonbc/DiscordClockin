const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");

module.exports = {
  id: "clock_out",
  async execute(interaction, { api }) {
    try {
      const response = await api.endShift({
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });

      const embed = createSuccessEmbed("You are now clocked out. Have a great rest of your day!").addFields({
        name: "Total worked",
        value: `${response.worker.total_worked_hours.toFixed(2)}h`,
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
