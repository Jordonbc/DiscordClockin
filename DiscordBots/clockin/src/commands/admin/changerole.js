const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("change-role")
    .setDescription("Change a worker's role and experience")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Worker to update")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("roleid")
        .setDescription("Role ID to assign")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("experience")
        .setDescription("Experience level to set")
        .setRequired(true)
    ),
  async execute(interaction, { api }) {
    const user = interaction.options.getUser("user", true);
    const roleId = interaction.options.getString("roleid", true).trim();
    const experience = interaction.options.getString("experience", true).trim();

    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await api.changeWorkerRole({
        guildId: interaction.guildId,
        userId: user.id,
        roleId,
        experience,
      });

      const worker = response.worker;
      const embed = createSuccessEmbed(
        `${user} has been updated to **${worker.experience || "No experience"} ${worker.role_id}**.`
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
