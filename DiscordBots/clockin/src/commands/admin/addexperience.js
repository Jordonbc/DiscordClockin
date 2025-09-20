const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addexperience")
    .setDescription("Create a new worker experience level")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The name of the new experience level")
        .setRequired(true)
    ),
  async execute(interaction, { api }) {
    const name = interaction.options.getString("name", true).trim();

    if (name.length === 0) {
      await interaction.reply({
        content: "Experience name cannot be empty.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await api.addExperience({
        guildId: interaction.guildId,
        name,
      });

      const experiences = response?.roles?.experiences || [];
      const embed = createSuccessEmbed(
        `<:rocketlunch:1256286588233842708> Added new experience **${name}**.\n` +
          `Total experiences configured: **${experiences.length}**`
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
