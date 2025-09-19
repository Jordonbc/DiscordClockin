const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

async function requestTimeOffModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("timeoff_request_modal")
    .setTitle("Request time off");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Reason")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(400)
    )
  );

  await interaction.showModal(modal);
}

module.exports = {
  requestTimeOffModal,
};
