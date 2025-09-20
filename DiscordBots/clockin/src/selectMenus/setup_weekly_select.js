const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { refreshSetupStatus } = require("../workflows/setupStatus");

module.exports = {
  id: "setup_weekly_select",
  async execute(interaction, { api }) {
    const channelId = interaction.values[0];

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { weekly_report_channel_id: channelId },
      });

      const embed = createSuccessEmbed(`Weekly report channel set to <#${channelId}>.`);
      await interaction.update({ embeds: [embed], components: [] });
      await refreshSetupStatus(interaction, { api });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.update({ embeds: [embed], components: [] });
    }
  },
};
