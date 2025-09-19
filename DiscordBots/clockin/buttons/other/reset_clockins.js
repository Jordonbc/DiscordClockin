const {} = require("discord.js");
const mongoose = require("mongoose");
const Worker = require("../../models/worker.js");

module.exports = {
  id: "manageUser_reset_clockins_button",
  permissions: ["Administrator"],
  run: async (client, interaction) => {
    const guildWorkers = await Worker.findOne({
      guildId: interaction.guild.id,
    });
    const worker = guildWorkers.workers.find(
      (worker) => worker.userId === interaction.message.embeds[0].footer.text
    );

    worker.clockDates.clockIn = [];
    worker.clockDates.clockOut = [];
    await guildWorkers.save();

    try {
      await interaction.deferUpdate();
    } catch (error) {
      if (error.code === 10008 || error.message?.includes("Unknown Message")) {
        console.warn("reset_clockins: original message missing, skipping update");
      } else {
        throw error;
      }
    }
  },
};
