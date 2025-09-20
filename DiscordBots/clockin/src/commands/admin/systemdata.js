const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const os = require("os");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("systemdata")
    .setDescription("Display host system statistics")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    const embed = new EmbedBuilder()
      .setColor("Purple")
      .setTitle("System statistics")
      .addFields(
        { name: "CPU", value: cpus?.[0]?.model || "Unknown", inline: false },
        {
          name: "Cores",
          value: `${cpus.length}`,
          inline: true,
        },
        {
          name: "Load average",
          value: os.loadavg().map((n) => n.toFixed(2)).join(", "),
          inline: true,
        },
        {
          name: "Memory",
          value: `${formatBytes(totalMem - freeMem)} / ${formatBytes(totalMem)}`,
          inline: true,
        }
      )
      .setTimestamp(new Date());

    await interaction.editReply({ embeds: [embed] });
  },
};

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(2)} ${units[unit]}`;
}
