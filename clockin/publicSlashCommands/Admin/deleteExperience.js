const {
  EmbedBuilder,
  ApplicationCommandType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} = require("discord.js");
const Role = require("../../models/roles.js");
require("dotenv").config();

const defaultColor = process.env.DEFAULT_COLOR;

module.exports = {
  name: "removeexperience",
  description: "» Delete a existing worker experience",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  default_member_permissions: "Administrator",
  plan: "Pro",
  category: "Admin",
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    let guildRoles = await Role.findOne({ guildId: interaction.guild.id });
    if (!guildRoles) {
      guildRoles = new Role({
        guildId: interaction.guild.id,
      });
    }
    if (guildRoles.experiences.length <= 1) {
      const minExperiences = new EmbedBuilder()
        .setDescription(
          `🚫 ${interaction.user}, You need to have at least 1 experience!`
        )
        .setColor("Red");

      return interaction.editReply({ embeds: [minExperiences] });
    }

    const StringSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("experience_delete_selectMenu")
      .setPlaceholder("Select the role experience")
      .setMaxValues(1);

    for (experience of guildRoles.experiences) {
      StringSelectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(experience)
          .setValue(experience)
          .setDefault(false)
      );
    }

    const row1 = new ActionRowBuilder().addComponents(StringSelectMenu);

    const embed = new EmbedBuilder()
      .setColor(defaultColor)
      .setDescription("Select which experience you want to delete.");

    interaction.editReply({ embeds: [embed], components: [row1] });
  },
};
