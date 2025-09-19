const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");

module.exports = {
  id: "clock_break_end",
  async execute(interaction, { api }) {
    try {
      await api.endBreak({
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });

      const embed = createSuccessEmbed("Welcome back! You're now clocked in.");
      await interaction.reply({ embeds: [embed], ephemeral: true, components: [] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
