const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  id: "setup_targetTime_button",
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("setup_targetTime_modal")
      .setTitle("Set target hours");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("target_hours")
          .setLabel("Target hours per worker")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("40")
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  },
};
