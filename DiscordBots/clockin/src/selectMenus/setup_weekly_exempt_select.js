const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { refreshSetupStatus } = require("../workflows/setupStatus");

module.exports = {
  id: "setup_weekly_exempt_select",
  async execute(interaction, { api }) {
    const roleId = interaction.values[0];

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { weekly_exempt_role: roleId },
      });

      const embed = createSuccessEmbed(`Weekly exempt role set to <@&${roleId}>.`);
      await interaction.update({ embeds: [embed], components: [] });
      await refreshSetupStatus(interaction, { api });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.update({ embeds: [embed], components: [] });
    }
  },
};
