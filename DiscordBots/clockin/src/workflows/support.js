const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const { createSuccessEmbed } = require("../utils/embeds");

async function submitIssueModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("support_issue_modal")
    .setTitle("Report an issue");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("issue")
        .setLabel("Describe the issue")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
    )
  );

  await interaction.showModal(modal);
}

async function submitSuggestionModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("support_suggestion_modal")
    .setTitle("Send a suggestion");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("suggestion")
        .setLabel("Share your idea")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
    )
  );

  await interaction.showModal(modal);
}

async function handleSupportModal(interaction, fieldName) {
  const content = interaction.fields.getTextInputValue(fieldName);
  const embed = createSuccessEmbed("Thanks! We've received your submission.").addFields({
    name: "Submission",
    value: content,
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = {
  submitIssueModal,
  submitSuggestionModal,
  handleSupportModal,
};
