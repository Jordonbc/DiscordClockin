const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");

module.exports = {
  id: "setup_workerVoiceChats_button",
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("setup_voicechannels_select")
        .setPlaceholder("Select worker voice channels")
        .setChannelTypes(
          ChannelType.GuildVoice,
          ChannelType.GuildStageVoice
        )
        .setMinValues(1)
        .setMaxValues(25)
    );

    await interaction.reply({
      content: "Select voice channels to monitor for workers.",
      components: [row],
      ephemeral: true,
    });
  },
};
