const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { refreshSetupStatus } = require("../workflows/setupStatus");

module.exports = {
  id: "setup_voice_exempt_select",
  async execute(interaction, { api }) {
    const roles = interaction.values;

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { voice_exempt_role: roles },
      });

      const embed = createSuccessEmbed("Voice exempt roles updated successfully.");
      await interaction.update({ embeds: [embed], components: [] });
      await refreshSetupStatus(interaction, { api });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.update({ embeds: [embed], components: [] });
    }
  },
};
