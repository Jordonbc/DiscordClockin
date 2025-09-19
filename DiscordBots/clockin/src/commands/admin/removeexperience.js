const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removeexperience")
    .setDescription("Delete an existing worker experience level")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the experience to remove")
        .setRequired(true)
    ),
  async execute(interaction, { api }) {
    const experience = interaction.options.getString("name", true).trim();

    if (experience.length === 0) {
      await interaction.reply({
        content: "Experience name cannot be empty.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await api.removeExperience({
        guildId: interaction.guildId,
        name: experience,
      });

      const embed = createSuccessEmbed(
        `<:trashcheck:1256347980659818648> Removed experience **${experience}**. Remaining: **${response.roles.experiences.length}**`
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
