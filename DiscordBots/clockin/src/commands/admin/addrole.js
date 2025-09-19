const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { createErrorEmbed } = require("../../utils/embeds");
const { encodeInteractionState } = require("../../utils/state");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#00FF00";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addrole")
    .setDescription("Create a new worker role")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the role to create")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Department/category for the role")
        .setRequired(true)
    ),
  async execute(interaction, { api }) {
    const name = interaction.options.getString("name", true).trim();
    const category = interaction.options.getString("category", true).trim();

    if (!name.length || !category.length) {
      await interaction.reply({
        content: "Both name and category are required.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const [settings, rolesDoc] = await Promise.all([
        api.getSettings({ guildId: interaction.guildId }),
        api.getRoles({ guildId: interaction.guildId }),
      ]);

      enforceRoleLimit(settings, rolesDoc);

      const experiences = rolesDoc.experiences || [];

      if (experiences.length === 0) {
        await interaction.editReply({
          embeds: [createErrorEmbed(new Error("You must configure at least one experience before creating roles."))],
        });
        return;
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId(
          `addrole_select_experiences:${encodeInteractionState({ name, category })}`
        )
        .setPlaceholder("Select the experiences available for this role")
        .setMinValues(1)
        .setMaxValues(Math.min(4, experiences.length));

      experiences.forEach((experience) => {
        select.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(experience.slice(0, 100))
            .setValue(experience)
        );
      });

      const embed = new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setTitle("Create a new role")
        .setDescription(
          `Role: **${name}**\nCategory: **${category}**\n\nSelect the experience levels that apply to this role. ` +
            "You will be prompted to define the hourly salary for each selection."
        );

      await interaction.editReply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(select)],
      });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

function enforceRoleLimit(settings, rolesDoc) {
  const plan = settings?.plan?.toLowerCase();
  const existing = rolesDoc?.roles?.length || 0;

  if (plan === "basic" && existing >= 10) {
    throw new Error(
      "This server reached the maximum of 10 roles for the Basic plan. Upgrade to create more roles."
    );
  }
}
