const {
  EmbedBuilder,
  ApplicationCommandType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} = require("discord.js");
const mongoose = require("mongoose");
const Role = require("../../models/roles.js");

module.exports = {
  name: "rolelist",
  description: "» Shows you all roles",
  cooldown: 3000,
  type: ApplicationCommandType.ChatInput,
  guildOnly: true,
  default_member_permissions: "Administrator",
  plan: "Basic",
  category: "Admin",
  options: [],
  run: async (client, interaction) => {
    await interaction.deferReply();

    const roles = await Role.findOne({ guildId: interaction.guild.id });

    if (!roles?.categorys[0]) {
      const errorEmbed = new EmbedBuilder()
        .setColor("Red")
        .setDescription("You actually dont have any roles!");

      return interaction.editReply({ embeds: [errorEmbed] });
    }

    const options = [];
    roles.categorys.forEach((role) => {
      options.push(
        new StringSelectMenuOptionBuilder().setLabel(role).setValue(role)
      );
    });
    const select = new StringSelectMenuBuilder()
      .setCustomId("roleList_categorys_selectMenu")
      .setPlaceholder("Choose a category!")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    const embed = new EmbedBuilder()
      .setDescription(
        "Choose a category for the role from the select menu below."
      )
      .setColor("Aqua");

    interaction.editReply({ embeds: [embed], components: [row] });
  },
};
