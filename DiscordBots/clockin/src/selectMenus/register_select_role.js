const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { createErrorEmbed } = require("../utils/embeds");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#00FF00";

module.exports = {
  id: "register_select_role",
  async execute(interaction, { api }) {
    const selectedRoleId = interaction.values[0];

    try {
      const data = await api.getRoles({ guildId: interaction.guildId });
      const role = data.roles.find((entry) => entry.id === selectedRoleId);
      if (!role) {
        throw new Error("The selected role could not be found. Please try again.");
      }

      if (!role.experiences || role.experiences.length === 0) {
        const { completeRegistration } = require("../workflows/registerWorker");
        await completeRegistration(interaction, { api }, role.id, undefined);
        return;
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`register_select_experience:${role.id}`)
        .setPlaceholder("Select an experience level")
        .setMinValues(1)
        .setMaxValues(1);

      for (const experience of role.experiences) {
        menu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(experience.slice(0, 100))
            .setValue(experience)
        );
      }

      const embed = new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setTitle("Select experience level")
        .setDescription(
          `Role: **${role.name}**\nChoose the experience level that best matches your profile.`
        );

      await interaction.update({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(menu)],
      });
    } catch (error) {
      const embed = createErrorEmbed(error);
      await interaction.update({ embeds: [embed], components: [] });
    }
  },
};
