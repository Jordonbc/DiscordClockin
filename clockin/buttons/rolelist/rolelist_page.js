const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  id: "page_rolelist",
  //permissions: [],
  run: async (client, interaction) => {
    const modal = new ModalBuilder()
      .setCustomId("rolelist_page_modal")
      .setTitle("🔢 | Rolelist page");

    const pageInput = new TextInputBuilder()
      .setCustomId("page_input")
      .setLabel("To which page you want go?")
      .setMaxLength(3)
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const firstActionRow = new ActionRowBuilder().addComponents(pageInput);

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  },
};
