const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

// this button handler is called when the set AFK Reminder button is clicked
module.exports = {
  id: "setup_afkReminder_button",
  run: async (client, interaction) => {
    const modal = new ModalBuilder()
      .setCustomId("set_afk_reminder_modal")
      .setTitle("Set AFK Reminder Limit");

    const maxAfkInput = new TextInputBuilder()
      .setCustomId("max_afk_input")
      .setLabel("Enter Max AFK Time (in hours)")
      .setPlaceholder("Example: 2")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(maxAfkInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  },
};
