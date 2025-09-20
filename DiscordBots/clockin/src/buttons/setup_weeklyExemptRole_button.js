const { ActionRowBuilder, RoleSelectMenuBuilder } = require("discord.js");

module.exports = {
  id: "setup_weeklyExemptRole_button",
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId("setup_weekly_exempt_select")
        .setPlaceholder("Select a weekly exempt role")
        .setMinValues(1)
        .setMaxValues(1)
    );

    await interaction.reply({
      content: "Choose the role exempt from weekly requirements.",
      components: [row],
      ephemeral: true,
    });
  },
};
