const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("bot-info").setDescription("Display bot information"),
  async execute(interaction) {
    const client = interaction.client;
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("Clockin bot info")
      .addFields(
        { name: "Guilds", value: `${client.guilds.cache.size}`, inline: true },
        { name: "Users", value: `${client.users.cache.size}`, inline: true },
        { name: "Uptime", value: formatDuration(client.uptime), inline: true }
      )
      .setTimestamp(new Date());

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

function formatDuration(ms) {
  if (!ms) return "N/A";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours % 24) parts.push(`${hours % 24}h`);
  if (minutes % 60) parts.push(`${minutes % 60}m`);
  if (seconds % 60) parts.push(`${seconds % 60}s`);

  return parts.join(" ") || `${seconds}s`;
}
