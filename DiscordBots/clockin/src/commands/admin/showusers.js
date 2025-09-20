const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createErrorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("showusers")
    .setDescription("List registered workers")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction, { api }) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await api.listWorkers({ guildId: interaction.guildId });
      const workers = response?.workers || [];

      if (workers.length === 0) {
        await interaction.editReply({
          embeds: [new EmbedBuilder().setColor("Yellow").setDescription("No workers registered yet.")],
        });
        return;
      }

      const lines = workers
        .slice(0, 25)
        .map((worker) => `• <@${worker.user_id}> — ${worker.role_id}${worker.experience ? ` (${worker.experience})` : ""}`);

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("Registered workers")
        .setDescription(lines.join("\n"));

      if (workers.length > 25) {
        embed.setFooter({ text: `Showing 25 of ${workers.length} workers.` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
