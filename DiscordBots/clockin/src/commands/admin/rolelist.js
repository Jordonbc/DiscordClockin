const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { createErrorEmbed } = require("../../utils/embeds");
const { encodeInteractionState } = require("../../utils/state");

const PAGE_SIZE = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolelist")
    .setDescription("List configured worker roles")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction, { api }) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const rolesView = await api.getRoles({ guildId: interaction.guildId });
      const roles = Array.isArray(rolesView?.roles) ? rolesView.roles : [];

      if (roles.length === 0) {
        await interaction.editReply({
          embeds: [new EmbedBuilder().setColor("Yellow").setDescription("No roles configured yet.")],
        });
        return;
      }

      await interaction.editReply(
        buildRolePage({
          roles,
          page: 0,
          experiences: rolesView?.experiences || [],
        })
      );
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

function buildRolePage({ roles, experiences, page }) {
  const start = page * PAGE_SIZE;
  const entries = roles.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(roles.length / PAGE_SIZE);

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("Configured roles")
    .setFooter({ text: `Page ${page + 1} of ${totalPages}` });

  entries.forEach((role) => {
    const hourlyEntries = Object.entries(role.hourly_salary || {});
    const hourly = hourlyEntries.length
      ? hourlyEntries
          .map(([experience, rate]) => `${experience}: $${Number(rate).toFixed(2)}`)
          .join("\n")
      : "No hourly salary configured";

    const experiencesLabel = Array.isArray(role.experiences) && role.experiences.length
      ? role.experiences.join(", ")
      : "None";

    embed.addFields({
      name: `${role.name} (${role.id})`,
      value: `Category: **${role.category}**\nExperiences: ${experiencesLabel}\n${hourly}`,
    });
  });

  const state = encodeInteractionState({ page, roles, experiences });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rolelist_prev:${state}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`rolelist_next:${state}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );

  return { embeds: [embed], components: [buttons] };
}

module.exports.buildRolePage = buildRolePage;
