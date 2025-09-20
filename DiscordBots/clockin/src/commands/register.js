const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { createErrorEmbed } = require("../utils/embeds");

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

function buildWorkerEmbed(user, worker) {
  const experienceText = worker.experience ? worker.experience : "Not set";
  return new EmbedBuilder()
    .setTitle("Worker registered")
    .setDescription(`${user} is ready to start working!`)
    .addFields(
      { name: "Role", value: worker.role_id, inline: true },
      { name: "Experience", value: experienceText, inline: true },
      { name: "Status", value: worker.status, inline: true }
    )
    .setTimestamp(new Date());
}
