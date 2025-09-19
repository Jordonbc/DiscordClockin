const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

async function requestTimeOffModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("timeoff_request_modal")
    .setTitle("Request time off");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("dates")
        .setLabel("Dates requested")
        .setPlaceholder("e.g., Aug 12 – Aug 16, 2024")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("coverage")
        .setLabel("Coverage plan (optional)")
        .setPlaceholder("Who can cover while you're away?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(150)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Reason")
        .setPlaceholder("Share any context or notes for your manager")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
    )
  );

  await interaction.showModal(modal);
}

module.exports = {
  requestTimeOffModal,
};
