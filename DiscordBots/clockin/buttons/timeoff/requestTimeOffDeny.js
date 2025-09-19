const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const mongoose = require("mongoose");
const Worker = require("../../models/worker.js");

// this button handler is called when the admin clicks on the deny button in the time off request
module.exports = {
  id: "timeOff_deny_button",
  permissions: ["Administrator"],
  run: async (client, interaction) => {
    const modal = new ModalBuilder()
      .setCustomId("timeOff_deny_modal")
      .setTitle("❌ | Time Off Deny");

    const reason = new TextInputBuilder()
      .setCustomId("reason_input")
      .setLabel("What´s the reason for the deny?")
      .setMaxLength(1200)
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const firstActionRow = new ActionRowBuilder().addComponents(reason);

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  },
};
