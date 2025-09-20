const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const { createSuccessEmbed, applyInteractionBranding } = require("../utils/embeds");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#5865F2";

async function submitIssueModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("support_issue_modal")
    .setTitle("Report an issue");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("issue_summary")
        .setLabel("Issue summary")
        .setPlaceholder("Briefly describe the problem")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("issue_details")
        .setLabel("What happened?")
        .setPlaceholder("Let us know what you expected and what actually happened")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("issue_impact")
        .setLabel("Impact & urgency (optional)")
        .setPlaceholder("Is anyone blocked? Include severity if helpful")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(150)
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
        .setCustomId("suggestion_title")
        .setLabel("Idea title")
        .setPlaceholder("Give your idea a short title")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("suggestion_details")
        .setLabel("Share your idea")
        .setPlaceholder("Explain the idea and how it would help the team")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("suggestion_benefit")
        .setLabel("Expected impact (optional)")
        .setPlaceholder("Who benefits? What's the outcome?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(150)
    )
  );

  await interaction.showModal(modal);
}

async function handleSupportModal(interaction, type) {
  if (type === "issue") {
    const summary = interaction.fields.getTextInputValue("issue_summary");
    const details = interaction.fields.getTextInputValue("issue_details");
    const impact = interaction.fields.getTextInputValue("issue_impact").trim();

    const embed = createSuccessEmbed(
      "Thanks for flagging the issue. Our support team will review the details and follow up if we need anything else."
    )
      .setTitle("Issue submitted")
      .addFields(
        { name: "Summary", value: summary },
        { name: "Details", value: details }
      );

    if (impact) {
      embed.addFields({ name: "Impact & urgency", value: impact });
    }

    embed.addFields({
      name: "Follow-up",
      value: "You'll receive a DM once the team has an update.",
    });

    applyInteractionBranding(embed, interaction, {
      accentEmoji: "🛠️",
      color: DEFAULT_COLOR,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const title = interaction.fields.getTextInputValue("suggestion_title");
  const details = interaction.fields.getTextInputValue("suggestion_details");
  const benefit = interaction.fields.getTextInputValue("suggestion_benefit").trim();

  const embed = createSuccessEmbed(
    "Thanks for sharing your idea! We'll review it with the product team and reach out if we move forward."
  )
    .setTitle("Suggestion received")
    .addFields(
      { name: "Idea", value: title },
      { name: "Details", value: details }
    );

  if (benefit) {
    embed.addFields({ name: "Expected impact", value: benefit });
  }

  embed.addFields({
    name: "Thanks!",
    value: "We appreciate you helping us improve the experience.",
  });

  applyInteractionBranding(embed, interaction, {
    accentEmoji: "💡",
    color: DEFAULT_COLOR,
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = {
  submitIssueModal,
  submitSuggestionModal,
  handleSupportModal,
};
