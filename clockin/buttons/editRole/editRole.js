const { ButtonBuilder, ActionRowBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  id: "edit_role_button",
  //permissions: [],
  run: async (client, interaction) => {
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Name")
        .setStyle("Primary")
        .setCustomId("editRole_name_button"),
      new ButtonBuilder()
        .setLabel("Salary")
        .setStyle("Primary")
        .setCustomId("editRole_salary_button"),
      new ButtonBuilder()
        .setLabel("Category")
        .setStyle("Primary")
        .setCustomId("editRole_category_button")
    );

    const embed = new EmbedBuilder(interaction.message.embeds[0])
      .setTitle("**__EDIT ROLE__**")
      .setColor("Blurple");

    interaction.update({ embeds: [embed], components: [buttons] });
  },
};
