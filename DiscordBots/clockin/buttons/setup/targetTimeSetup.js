const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const messageIds = require("../../models/messageIds.js");

module.exports = {
  id: "setup_targetTime_button",
  run: async (client, interaction) => {
    // create a modal to set the target time
    const modal = new ModalBuilder()
      .setCustomId("target_time_modal")
      .setTitle("Set Target Time");

    const timeInput = new TextInputBuilder()
      .setCustomId("target_time_input")
      .setLabel("Enter Target Time (in hours)")
      .setPlaceholder("Example: 8")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(timeInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  },
};
