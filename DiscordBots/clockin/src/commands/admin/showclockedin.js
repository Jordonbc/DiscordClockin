const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { createErrorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("showclockedin")
    .setDescription("Show workers currently clocked in or on break")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction, { api }) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await api.listWorkers({ guildId: interaction.guildId });
      const workers = response?.workers || [];
      const active = workers.filter((worker) => ["Work", "Break"].includes(worker.status));

      if (active.length === 0) {
        await interaction.editReply({
          embeds: [new EmbedBuilder().setColor("Green").setDescription("No one is clocked in right now.")],
        });
        return;
      }

      const lines = active
        .slice(0, 25)
        .map((worker) => `• <@${worker.user_id}> — ${worker.status}`);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Currently active workers")
        .setDescription(lines.join("\n"));

      if (active.length > 25) {
        embed.setFooter({ text: `Showing 25 of ${active.length} active workers.` });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
