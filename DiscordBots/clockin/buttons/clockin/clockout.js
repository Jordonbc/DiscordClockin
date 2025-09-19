const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const clockins = require("../../models/clockins.js");
const Workers = require("../../models/worker.js");

module.exports = {
  id: "clockout_new_button",
  //permissions: [],
  run: async (client, interaction) => {
    // Fetch the clockin DM message from the database
    const clockInData = await clockins.findOne({
      messageId: interaction.message.id,
    });

    // Fetch the worker data from the database
    const workers = await Workers.findOne({ guildId: clockInData.guildId });
    const worker = workers.workers.find(
      (worker) => worker.userId === interaction.user.id
    );

    if (!worker) {
      throw new Error("Worker not found");
    } else if (worker) {
      if (worker.status === "Work" || worker.status === "Break") {
        const modal = new ModalBuilder()
          .setCustomId("clockout_new_modal")
          .setTitle("📑 | Work description");

        const workInput = new TextInputBuilder()
          .setCustomId("clockout_input")
          .setLabel("What have you accomplished today?")
          .setMinLength(100)
          .setMaxLength(1200)
          .setRequired(true)

          .setStyle(TextInputStyle.Paragraph);

        const firstActionRow = new ActionRowBuilder().addComponents(workInput);

        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
      } else if (worker.status === "Offline")
        return interaction.reply({
          content: "You are currently not working",
          flags: 64,
        });
    }
  },
};
