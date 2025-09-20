const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deleteuser")
    .setDescription("Remove a worker from the guild records")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Worker to remove")
        .setRequired(true)
    ),
  async execute(interaction, { api }) {
    const user = interaction.options.getUser("user", true);

    await interaction.deferReply({ ephemeral: true });

    try {
      await api.deleteWorker({
        guildId: interaction.guildId,
        userId: user.id,
      });

      const embed = createSuccessEmbed(`${user} has been removed from the worker roster.`);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
