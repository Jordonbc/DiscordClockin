const {
  EmbedBuilder,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
} = require("discord.js");

// this button is present in the embed created on running the /setup-status command
module.exports = {
  id: "setup_voiceExemptRole_button",
  //permissions: [],
  run: async (client, interaction) => {
    await interaction.deferUpdate();

    const embed = new EmbedBuilder()
      .setColor("#81e6ff")
      .setDescription("Choose a role");

    // create a select menu with all the roles in the guild
    const row = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId("setup_voiceExemptRole_selectMenu")
        .setPlaceholder("📣 › Choose a role for the voice exempt")
        .setMinValues(0)
        .setMaxValues(2)
    );

    interaction.editReply({ embeds: [embed], components: [row] });
  },
};
