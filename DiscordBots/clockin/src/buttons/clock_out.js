const { createErrorEmbed } = require("../utils/embeds");
const { getGuildIdFromInteraction } = require("../utils/interactions");
const { isPrivilegedMember } = require("../utils/permissions");
const { buildClockOutSummaryModal } = require("../views/clockOutSummaryModal");

module.exports = {
  id: "clock_out",
  async execute(interaction, { api }) {
    try {
      const guildId = getGuildIdFromInteraction(interaction);
      if (!guildId) {
        await interaction.reply({
          content: "I couldn't tell which server to clock you out from. Try clocking in again first.",
          ephemeral: true,
        });
        return;
      }

      if (interaction.inGuild()) {
        const settingsPayload = await api.getSettings({ guildId });
        const settings = settingsPayload?.settings;
        if (!isPrivilegedMember(interaction, settings)) {
          await interaction.reply({
            content: "Clock out using the red button in the DM I sent when you started your shift.",
            ephemeral: true,
          });
          return;
        }
      }

      const modal = buildClockOutSummaryModal({
        guildId,
        origin: interaction.inGuild() ? "guild_button" : "dm_button",
      });
      await interaction.showModal(modal);
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
