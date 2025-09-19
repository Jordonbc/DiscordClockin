const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  id: "setup_timeZone_button",
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("setup_timezone_modal")
      .setTitle("Set guild timezone");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("timezone")
          .setLabel("IANA timezone (e.g. Europe/London)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50)
      )
    );

    await interaction.showModal(modal);
  },
};
