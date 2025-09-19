const { createErrorEmbed, createSuccessEmbed } = require("../utils/embeds");
const { completeRegistration } = require("../workflows/registerWorker");

module.exports = {
  id: "register_select_experience",
  async execute(interaction, context) {
    const [_, roleId] = interaction.customId.split(":");
    const experience = interaction.values[0];

    if (!roleId) {
      const embed = createErrorEmbed(new Error("Missing role information for registration."));
      await interaction.update({ embeds: [embed], components: [] });
      return;
    }

    await completeRegistration(interaction, context, roleId, experience);
  },
};
