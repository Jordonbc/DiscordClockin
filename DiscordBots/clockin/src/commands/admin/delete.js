const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Delete data from the guild storage")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("workers")
        .setDescription("Delete all worker records")
    )
    .addSubcommand((sub) =>
      sub
        .setName("roles")
        .setDescription("Delete all configured roles")
    )
    .addSubcommand((sub) =>
      sub
        .setName("all")
        .setDescription("Delete all worker and role data")
    ),
  async execute(interaction, { api }) {
    const choice = interaction.options.getSubcommand(true);

    await interaction.deferReply({ ephemeral: true });

    try {
      if (choice === "workers") {
        const result = await api.deleteAllWorkers({ guildId: interaction.guildId });
        const removed = result?.removed ?? 0;
        await interaction.editReply({
          embeds: [createSuccessEmbed(`Deleted **${removed}** worker records.`)],
        });
        return;
      }

      if (choice === "roles") {
        const result = await api.deleteAllRoles({ guildId: interaction.guildId });
        const removed = result?.removed ?? 0;
        await interaction.editReply({
          embeds: [createSuccessEmbed(`Deleted **${removed}** roles.`)],
        });
        return;
      }

      if (choice === "all") {
        const result = await api.deleteAllData({ guildId: interaction.guildId });
        const workers = result?.workers_removed ?? 0;
        const roles = result?.roles_removed ?? 0;
        await interaction.editReply({
          embeds: [createSuccessEmbed(`Deleted **${workers}** workers and **${roles}** roles.`)],
        });
        return;
      }

      await interaction.editReply({
        embeds: [createErrorEmbed(new Error("Unsupported delete option."))],
      });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
