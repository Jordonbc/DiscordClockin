const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

const ALLOWED_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
]);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-log")
    .setDescription("Set the channel used for Clockin log messages")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel that should receive log messages")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement
        )
        .setRequired(false)
    ),
  async execute(interaction, { api }) {
    const providedChannel = interaction.options.getChannel("channel");
    const channel = providedChannel ?? interaction.channel;

    if (!channel || !ALLOWED_CHANNEL_TYPES.has(channel.type)) {
      await interaction.reply({
        content:
          "Please choose a text channel in this server for log messages.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { log_channel_id: channel.id },
      });

      const embed = createSuccessEmbed(`Log channel updated to <#${channel.id}>.`);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
