const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { refreshSetupStatus } = require("../workflows/setupStatus");

module.exports = {
  id: "setup_log_select",
  async execute(interaction, { api }) {
    const channelId = interaction.values[0];

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { log_channel_id: channelId },
      });

      const embed = createSuccessEmbed(`Log channel updated to <#${channelId}>.`);
      await interaction.update({ embeds: [embed], components: [] });
      await refreshSetupStatus(interaction, { api });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.update({ embeds: [embed], components: [] });
    }
  },
};
