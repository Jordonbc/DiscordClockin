const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  id: "setup_afkReminder_button",
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("setup_afkReminder_modal")
      .setTitle("Set AFK reminder interval");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("afk_interval")
          .setLabel("Reminder interval (hours)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("2")
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  },
};
