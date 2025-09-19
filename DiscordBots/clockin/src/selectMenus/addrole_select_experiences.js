const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const { decodeInteractionState } = require("../utils/state");

module.exports = {
  id: "addrole_select_experiences",
  async execute(interaction) {
    const [, encoded] = interaction.customId.split(":");
    const state = decodeInteractionState(encoded);
    const experiences = interaction.values;

    const modal = new ModalBuilder()
      .setCustomId(`addrole_salaries:${encoded}`)
      .setTitle("Define hourly salaries");

    for (const experience of experiences) {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(experience)
            .setLabel(`${experience} hourly salary`)
            .setPlaceholder("14.80")
            .setMaxLength(6)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    }

    await interaction.showModal(modal);
  },
};
