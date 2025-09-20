const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { refreshSetupStatus } = require("../workflows/setupStatus");

function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(Date.now());
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  id: "setup_timezone_modal",
  async execute(interaction, { api }) {
    const timezone = interaction.fields.getTextInputValue("timezone").trim();

    if (!isValidTimezone(timezone)) {
      const embed = createErrorEmbed(new Error("Please provide a valid IANA timezone (e.g. Europe/London)."));
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { time_zone: timezone },
      });

      const embed = createSuccessEmbed(`Timezone updated to **${timezone}**.`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      await refreshSetupStatus(interaction, { api });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
