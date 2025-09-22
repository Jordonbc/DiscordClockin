const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

const SUMMARY_FIELD_ID = "clock_out_summary_field";

function buildClockOutSummaryModal({ guildId, origin }) {
  const parts = ["clock_out_summary"];
  if (guildId) {
    parts.push(guildId);
  }
  if (origin) {
    parts.push(origin);
  }

  const modal = new ModalBuilder()
    .setCustomId(parts.join(":"))
    .setTitle("Clock out summary");

  const summaryInput = new TextInputBuilder()
    .setCustomId(SUMMARY_FIELD_ID)
    .setLabel("What did you work on during this shift?")
    .setPlaceholder("Share a quick summary of your progress.")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(5)
    .setMaxLength(1000);

  modal.addComponents(new ActionRowBuilder().addComponents(summaryInput));
  return modal;
}

module.exports = {
  buildClockOutSummaryModal,
  SUMMARY_FIELD_ID,
};
