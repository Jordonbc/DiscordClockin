const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { createErrorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weeklyreport")
    .setDescription("Show weekly hour summary for the guild"),
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

      const summaries = workers.map((worker) => ({
        userId: worker.user_id,
        weekly: worker.weekly_worked_hours,
        total: worker.total_worked_hours,
      }));

      const totalWeekly = summaries.reduce((acc, entry) => acc + entry.weekly, 0);
      const totalOverall = summaries.reduce((acc, entry) => acc + entry.total, 0);

      const top = summaries
        .sort((a, b) => b.weekly - a.weekly)
        .slice(0, 10)
        .map((entry, index) => `**${index + 1}.** <@${entry.userId}> — ${entry.weekly.toFixed(2)}h`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("Weekly report")
        .setDescription(top)
        .addFields(
          { name: "Total weekly hours", value: `${totalWeekly.toFixed(2)}h`, inline: true },
          { name: "Total cumulative hours", value: `${totalOverall.toFixed(2)}h`, inline: true },
          { name: "Workers counted", value: `${workers.length}`, inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
