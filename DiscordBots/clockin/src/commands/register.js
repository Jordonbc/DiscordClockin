const { SlashCommandBuilder } = require("discord.js");
const { ApiError } = require("../apiClient");
const { createErrorEmbed } = require("../utils/embeds");
const {
  buildWorkerEmbed,
  buildAlreadyRegisteredEmbed,
} = require("../utils/workers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register as a worker in the system")
    .addStringOption((option) =>
      option
        .setName("role")
        .setDescription("Role identifier configured in the backend")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("experience")
        .setDescription("Experience level configured in the backend")
        .setRequired(false)
    ),
  async execute(interaction, { api }) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: "This command can only be used inside a guild.",
        ephemeral: true,
      });
      return;
    }

    const roleId = interaction.options.getString("role", true);
    const experienceRaw = interaction.options.getString("experience", false);
    const experience = experienceRaw?.trim() || undefined;

    try {
      const existingWorker = await api.getWorker({
        guildId,
        userId: interaction.user.id,
      });

      if (existingWorker) {
        await interaction.reply({
          embeds: [buildAlreadyRegisteredEmbed(interaction.user, existingWorker)],
          ephemeral: true,
        });
        return;
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // Not registered yet; continue with registration.
      } else {
        const embed = createErrorEmbed(error);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    try {
      const response = await api.registerWorker({
        guildId,
        userId: interaction.user.id,
        roleId,
        experience,
      });

      await interaction.reply({
        embeds: [buildWorkerEmbed(interaction.user, response.worker)],
        ephemeral: true,
      });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
