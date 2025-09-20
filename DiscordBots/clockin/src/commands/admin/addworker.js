const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addworker")
    .setDescription("Register a user as a worker")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addUserOption((option) =>
      option.setName("user").setDescription("User to register").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("roleid").setDescription("Role ID to assign").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("experience").setDescription("Experience level").setRequired(false)
    ),
  async execute(interaction, { api }) {
    const user = interaction.options.getUser("user", true);
    const roleId = interaction.options.getString("roleid", true).trim();
    const experience = interaction.options.getString("experience")?.trim();

    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await api.registerWorker({
        guildId: interaction.guildId,
        userId: user.id,
        roleId,
        experience,
      });

      const worker = response.worker;
      const embed = createSuccessEmbed(
        `Registered ${user} as **${worker.role_id}**${worker.experience ? ` (${worker.experience})` : ""}.`
      );
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
