const {
  EmbedBuilder,
  ActionRowBuilder,
  ChannelType,
  ChannelSelectMenuBuilder,
} = require("discord.js");
const GuildSettings = require("../../models/guildSettings");

module.exports = {
  id: "setup_weeklyReport_button",
  //permissions: [],
  run: async (client, interaction) => {
    await interaction.deferUpdate();

    const guildSettings = await GuildSettings.findOne({
      guildId: interaction.guild.id,
    });

    const embed = new EmbedBuilder()
      .setColor("#81e6ff")
      .setDescription("Choose your channel");

    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId("weeklyReport_selectMenu")
        .setPlaceholder("📣 › Select a channel for the weekly reports")
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setDefaultChannels(
          guildSettings.weeklyReportChannelId
            ? [guildSettings.weeklyReportChannelId]
            : []
        )
        .setMinValues(0)
    );

    interaction.editReply({ embeds: [embed], components: [row] });
  },
};
