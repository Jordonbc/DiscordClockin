const { ActionRowBuilder, RoleSelectMenuBuilder } = require("discord.js");

module.exports = {
  id: "setup_voiceExemptRole_button",
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId("setup_voice_exempt_select")
        .setPlaceholder("Select voice exempt roles")
        .setMinValues(1)
        .setMaxValues(25)
    );

    await interaction.reply({
      content: "Select roles that are exempt from voice requirements.",
      components: [row],
      ephemeral: true,
    });
  },
};
