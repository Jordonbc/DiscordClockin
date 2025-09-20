const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require("discord.js");

module.exports = {
  id: "setup_weeklyReport_button",
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("setup_weekly_select")
        .setPlaceholder("Select weekly report channel")
        .setChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1)
    );

    await interaction.reply({
      content: "Choose the channel for weekly reports.",
      components: [row],
      ephemeral: true,
    });
  },
};
