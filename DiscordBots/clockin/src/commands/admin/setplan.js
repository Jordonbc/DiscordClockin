const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

const PLAN_CHOICES = [
  { name: "None", value: "none" },
  { name: "Basic", value: "Basic" },
  { name: "Pro", value: "Pro" },
  { name: "Elite", value: "Elite" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setplan")
    .setDescription("Set the subscription plan for this guild")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("plan")
        .setDescription("Plan level")
        .setRequired(true)
        .addChoices(...PLAN_CHOICES)
    ),
  async execute(interaction, { api }) {
    const plan = interaction.options.getString("plan", true);

    await interaction.deferReply({ ephemeral: true });

    try {
      await api.updateSettings({
        guildId: interaction.guildId,
        updates: { plan: plan === "none" ? null : plan },
      });

      const embed = createSuccessEmbed(`Plan updated to **${plan === "none" ? "None" : plan}**.`);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
