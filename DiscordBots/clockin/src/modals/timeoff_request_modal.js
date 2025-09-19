const { createSuccessEmbed, applyInteractionBranding } = require("../utils/embeds");

const DEFAULT_COLOR = process.env.DEFAULT_COLOR || "#5865F2";

module.exports = {
  id: "timeoff_request_modal",
  async execute(interaction) {
    const dates = interaction.fields.getTextInputValue("dates");
    const coverage = interaction.fields.getTextInputValue("coverage").trim();
    const reason = interaction.fields.getTextInputValue("reason");

    const embed = createSuccessEmbed(
      "Your time off request has been noted. A manager will review it shortly."
    )
      .setTitle("Time off request submitted")
      .addFields(
        { name: "Dates", value: dates },
        { name: "Reason", value: reason }
      );

    if (coverage) {
      embed.addFields({ name: "Coverage plan", value: coverage });
    }

    embed.addFields({
      name: "What happens next",
      value: "We'll reach out if any additional details are needed.",
    });

    applyInteractionBranding(embed, interaction, {
      accentEmoji: "🗓️",
      color: DEFAULT_COLOR,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
