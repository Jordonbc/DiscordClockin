const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const GuildSettings = require("../models/guildSettings");
const { setupStatusMessage } = require("../functions/syncData");

// this modal handler is called when the user clicks on set target time
module.exports = {
  id: "set_afk_reminder_modal",
  //permissions: [],
  run: async (client, interaction) => {
    // fetch the target time from the text input
    const afkTime = parseFloat(
      interaction.fields.getTextInputValue("max_afk_input")
    );

    // Validate input
    if (isNaN(afkTime) || afkTime <= 0) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("Please enter a valid number");

      return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    // Get or create guild settings
    let guildSettings = await GuildSettings.findOne({
      guildId: interaction.guild.id,
    });
    if (!guildSettings) {
      guildSettings = new GuildSettings({
        guildId: interaction.guild.id,
        maxAfkHours: afkTime,
      });
    } else {
      guildSettings.maxAfkHours = afkTime;
    }
    await guildSettings.save();

    // Send success message
    const successEmbed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(`Afk time set to ${afkTime} hours`);

    await interaction.reply({ embeds: [successEmbed], flags: 64 });

    try {
      // Generate new status message content
      const [statusEmbed, statusButtons] = await setupStatusMessage(
        guildSettings,
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
