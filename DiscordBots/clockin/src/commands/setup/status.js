const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed } = require("../../utils/embeds");
const { buildSetupStatusView } = require("../../views/setupStatus");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-status")
    .setDescription("View and update setup configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction, { api }) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const [settingsPayload, rolesPayload] = await Promise.all([
        api.getSettings({ guildId: interaction.guildId }),
        api.getRoles({ guildId: interaction.guildId }),
      ]);

      const view = buildSetupStatusView({
        guild: interaction.guild,
        settings: settingsPayload?.settings,
        rolesView: rolesPayload,
      });

      await interaction.editReply(view);
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
