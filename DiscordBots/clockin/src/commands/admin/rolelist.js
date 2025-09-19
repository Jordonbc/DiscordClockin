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
      const data = await api.getRoles({ guildId: interaction.guildId });
      const roles = data?.roles?.roles || [];

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
          experiences: data.roles.experiences || [],
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
    const hourly = Object.entries(role.hourly_salary)
      .map(([experience, rate]) => `${experience}: £${rate.toFixed(2)}p`)
      .join("\n");

    embed.addFields({
      name: `${role.name} (${role.id})`,
      value: `Category: **${role.category}**\nExperiences: ${role.experiences.join(", ")}\n${hourly}`,
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
