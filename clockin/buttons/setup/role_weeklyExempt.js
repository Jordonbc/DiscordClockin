const {
  EmbedBuilder,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
} = require("discord.js");

// remove it since no option for weekly report exemption has been provided in the select menu
module.exports = {
  id: "setup_weeklyExemptRole_button",
  //permissions: [],
  run: async (client, interaction) => {
    await interaction.deferUpdate();

    const embed = new EmbedBuilder()
      .setColor("#81e6ff")
      .setDescription("Choose a role");

    const row = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId("setup_weeklyExemptRole_selectMenu")
        .setPlaceholder("📣 › Choose a role for the weekly exempt")
        .setMinValues(0)
        .setMaxValues(1)
    );

    interaction.editReply({ embeds: [embed], components: [row] });
  },
};
