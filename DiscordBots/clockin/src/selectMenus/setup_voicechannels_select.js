const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { refreshSetupStatus } = require("../workflows/setupStatus");

module.exports = {
  id: "setup_voicechannels_select",
  async execute(interaction, { api }) {
    const channels = interaction.values;

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { worker_voice_chats: channels },
      });

      const channelList = channels.map((id) => `<#${id}>`).join(", ");
      const embed = createSuccessEmbed(`Worker voice chats updated: ${channelList}`);
      await interaction.update({ embeds: [embed], components: [] });
      await refreshSetupStatus(interaction, { api });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.update({ embeds: [embed], components: [] });
    }
  },
};
