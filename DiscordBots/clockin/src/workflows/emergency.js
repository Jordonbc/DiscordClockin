const { createSuccessEmbed, applyInteractionBranding } = require("../utils/embeds");

const ALERT_COLOR = process.env.ALERT_COLOR || "#F97316";

async function emergencyLeaveHandler(interaction) {
  const embed = createSuccessEmbed(
    "Emergency leave acknowledged. Take the time you need and let us know when you're back online."
  )
    .setTitle("Emergency leave logged")
    .addFields(
      {
        name: "Next steps",
        value:
          "We'll flag your status for leadership. If you haven't already, send a quick note to your manager so they know you're away.",
      },
      {
        name: "Need support?",
        value: "Reach out to HR if you require additional assistance or resources during your leave.",
      }
    );

  embed.addFields({
    name: "Take care",
    value: "We're here to help—reach out if anything changes.",
  });

  applyInteractionBranding(embed, interaction, {
    accentEmoji: "🚨",
    color: ALERT_COLOR,
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = {
  emergencyLeaveHandler,
};
