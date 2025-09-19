const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const GuildSettings = require("../models/guildSettings");
const { setupStatusMessage } = require("../functions/syncData");

module.exports = {
  id: "target_time_modal",
  run: async (client, interaction) => {
    const targetTime = parseFloat(
      interaction.fields.getTextInputValue("target_time_input")
    );

    // Validate input
    if (isNaN(targetTime) || targetTime <= 0) {
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
        targetHours: targetTime,
      });
    } else {
      guildSettings.targetHours = targetTime;
    }
    await guildSettings.save();

    // Send success message
    const successEmbed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(`Target time set to ${targetTime} hours`);

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
