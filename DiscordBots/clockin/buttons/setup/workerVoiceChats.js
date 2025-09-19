const {
  EmbedBuilder,
  ActionRowBuilder,
  ChannelType,
  ChannelSelectMenuBuilder,
} = require("discord.js");
const GuildSettings = require("../../models/guildSettings");

// this button belongs to the embed created on running the /setup-status command
module.exports = {
  id: "setup_workerVoiceChats_button",
  //permissions: [],
  run: async (client, interaction) => {
    await interaction.deferUpdate();

    // get the guild settings
    const guildSettings = await GuildSettings.findOne({
      guildId: interaction.guild.id,
    });

    const embed = new EmbedBuilder()
      .setColor("#81e6ff")
      .setDescription("Choose your channels");

    // create a select menu with all the voice channels in the guild
    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("workerVoiceChats_selectMenu")
        .setPlaceholder("🔊 › Select the worker voice chats")
        .setChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setDefaultChannels(guildSettings?.workerVoiceChats)
        .setMinValues(0)
        .setMaxValues(10)
    );

    interaction.editReply({ embeds: [embed], components: [row] });
  },
};
