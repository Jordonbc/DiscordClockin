const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { refreshSetupStatus } = require("../workflows/setupStatus");

module.exports = {
  id: "setup_admin_roles_select",
  async execute(interaction, { api }) {
    const roles = interaction.values;

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { bot_admin_role: roles },
      });

      const embed = createSuccessEmbed("Bot admin roles updated successfully.");
      await interaction.update({ embeds: [embed], components: [] });
      await refreshSetupStatus(interaction, { api });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.update({ embeds: [embed], components: [] });
    }
  },
};
