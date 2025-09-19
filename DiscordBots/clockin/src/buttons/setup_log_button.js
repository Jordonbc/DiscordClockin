const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");

module.exports = {
  id: "setup_log_button",
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("setup_log_select")
        .setPlaceholder("Select the log channel")
        .setChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1)
    );

    await interaction.reply({
      content: "Select the channel to store log messages.",
      components: [row],
      ephemeral: true,
    });
  },
};
