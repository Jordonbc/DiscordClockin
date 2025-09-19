const guildSettings = require("../models/guildSettings.js");
const { setupStatusMessage } = require("../functions/syncData");

module.exports = {
  id: "setup_timeZone_select",
  run: async (client, interaction) => {
    // await interaction.deferUpdate();

    // fetch the guild settings
    const settings = await guildSettings.findOne({
      guildId: interaction.guild.id,
    });

    // set the timezone
    const timeZone = interaction.values[0];
    settings.timeZone = timeZone;
    await settings.save();

    interaction.reply({
      content: `Timezone set to ${timeZone}`,
      flags: 64,
    });

    try {
      // Generate new status message content
      const [statusEmbed, statusButtons] = await setupStatusMessage(
        settings,
        interaction.guild
      );

      // Edit the original message
      await interaction.message.edit({
        embeds: [statusEmbed],
        components: statusButtons,
      });
    } catch (error) {
      console.error("Error updating status message:", error);
    }
  },
};
