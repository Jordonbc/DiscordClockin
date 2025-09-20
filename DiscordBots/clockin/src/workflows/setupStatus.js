const { buildSetupStatusView } = require("../views/setupStatus");
const { createErrorEmbed } = require("../utils/embeds");

async function refreshSetupStatus(interaction, { api }) {
  try {
    const [settingsPayload, rolesPayload] = await Promise.all([
      api.getSettings({ guildId: interaction.guildId }),
      api.getRoles({ guildId: interaction.guildId }),
    ]);

    const view = buildSetupStatusView({
      guild: interaction.guild,
      settings: settingsPayload?.settings,
      rolesView: rolesPayload,
    });

    await interaction.message.edit(view);
  } catch (error) {
    console.error("Failed to refresh setup status", error);
    const embed = createErrorEmbed(error);
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
}

module.exports = {
  refreshSetupStatus,
};
