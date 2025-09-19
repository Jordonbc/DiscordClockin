const { createSuccessEmbed } = require("../utils/embeds");

async function emergencyLeaveHandler(interaction) {
  const embed = createSuccessEmbed(
    "Emergency leave acknowledged. Please inform your supervisor as soon as possible."
  );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = {
  emergencyLeaveHandler,
};
