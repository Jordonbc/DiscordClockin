const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const Worker = require("../../models/worker.js");

// this button handler is never called because this option is part of the String Select Menu
module.exports = {
  id: "requestTimeOff_button",
  //permissions: [],
  run: async (client, interaction) => {
    const GuildWorkers = await Worker.findOne({
      guildId: interaction.guild.id,
    });
    const worker = GuildWorkers.workers.find(
      (worker) => worker.userId === interaction.user.id
    );

    if (!worker) {
      interaction.reply({
        content: "Please create your account first.",
        ephemeral: true,
      });
    } else if (worker) {
      const modal = new ModalBuilder()
        .setCustomId("requestTimeOff_modal")
        .setTitle("🕖 | Request Time Off");

      const reasonInput = new TextInputBuilder()
        .setCustomId("reason_input")
        .setLabel("Why you need time off?")
        .setMaxLength(1200)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const startInput = new TextInputBuilder()
        .setCustomId("start_input")
        .setLabel("From when are you going to be unavailable?")
        .setPlaceholder("dd/mm/yyyy")
        .setMaxLength(10)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const endInput = new TextInputBuilder()
        .setCustomId("end_input")
        .setLabel("When are you coming back?")
        .setPlaceholder("dd/mm/yyyy")
        .setMaxLength(10)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
      const secondActionRow = new ActionRowBuilder().addComponents(startInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(endInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

      await interaction.showModal(modal);
    }
  },
};
