const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

const SCOPE_CHOICES = [
  { name: "Daily", value: "daily" },
  { name: "Weekly", value: "weekly" },
  { name: "Total", value: "total" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addhours")
    .setDescription("Manually add hours to a worker")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Worker to adjust")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("scope")
        .setDescription("Which counters to adjust")
        .setRequired(true)
        .addChoices(...SCOPE_CHOICES)
    )
    .addNumberOption((option) =>
      option
        .setName("hours")
        .setDescription("Number of hours to add")
        .setRequired(true)
        .setMinValue(0.1)
    ),
  async execute(interaction, { api }) {
    const user = interaction.options.getUser("user", true);
    const scope = interaction.options.getString("scope", true);
    const hours = interaction.options.getNumber("hours", true);

    await interaction.deferReply({ ephemeral: true });

    try {
      const response = await api.addHours({
        guildId: interaction.guildId,
        userId: user.id,
        hours,
        scope,
      });

      const worker = response.worker;
      const embed = createSuccessEmbed(
        `Added **${hours.toFixed(2)}** hours (${scope}) to ${user}.\n` +
          `New totals — daily: **${worker.daily_worked_hours.toFixed(2)}h**, weekly: **${worker.weekly_worked_hours.toFixed(2)}h**, total: **${worker.total_worked_hours.toFixed(2)}h**.`
      );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
