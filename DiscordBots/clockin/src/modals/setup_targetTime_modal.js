const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { refreshSetupStatus } = require("../workflows/setupStatus");

module.exports = {
  id: "setup_targetTime_modal",
  async execute(interaction, { api }) {
    const valueRaw = interaction.fields.getTextInputValue("target_hours");
    const value = Number.parseFloat(valueRaw.replace(",", "."));

    if (!Number.isFinite(value) || value <= 0) {
      const embed = createErrorEmbed(new Error("Please provide a valid positive number."));
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { target_hours: value },
      });

      const embed = createSuccessEmbed(`Target hours set to **${value}**.`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await refreshSetupStatus(interaction, { api });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
