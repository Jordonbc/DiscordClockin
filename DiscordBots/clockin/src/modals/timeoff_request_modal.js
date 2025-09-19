const { createSuccessEmbed } = require("../utils/embeds");

module.exports = {
  id: "timeoff_request_modal",
  async execute(interaction) {
    const reason = interaction.fields.getTextInputValue("reason");

    const embed = createSuccessEmbed(
      "Your time off request has been noted. A manager will review it shortly."
    ).addFields({ name: "Reason", value: reason });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
