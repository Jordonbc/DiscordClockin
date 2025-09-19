const { ActionRowBuilder, RoleSelectMenuBuilder } = require("discord.js");

module.exports = {
  id: "setup_adminRole_button",
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId("setup_admin_roles_select")
        .setPlaceholder("Select bot admin roles")
        .setMinValues(1)
        .setMaxValues(25)
    );

    await interaction.reply({
      content: "Select roles that can manage the bot.",
      components: [row],
      ephemeral: true,
    });
  },
};
