const { MessageFlags } = require("discord.js");
const guildDB = require("../models/guildSettings.js");
const Workers = require("../models/worker.js");
const clockins = require("../models/clockins.js");
const Roles = require("../models/roles.js");
const redisPS = require("../utils/redisPubSubClient");
const generateEmbed = require("../functions/clockout/buildEmbed.js");
const { removeDelayedJob } = require("../functions/handleDelayedJob.js");
const handleWorkerEvents = require("../functions/handleWorkerEvents.js");
require("dotenv").config();

module.exports = {
  id: "clockout_new_modal",
  //permissions: [],
  run: async (client, interaction) => {
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

    // Find the clockin DM message in the database
    const clockInData = await clockins.findOne({
      messageId: interaction.message.id,
    });

    if (!clockInData) {
      return interaction.editReply({
        content:
          "I can't find a database entry for this message, please check if you have a newer clock in message.",
      });
    }

    // Find the worker in the database
    const workers = await Workers.findOne({ guildId: clockInData.guildId });
    const worker = workers.workers.find(
      (worker) => worker.userId === interaction.user.id
    );

    //Description of the days work
    const workersDescription =
      interaction.fields.getTextInputValue("clockout_input");

    if (!worker) {
      throw new Error("Worker not found");
    }

    //Handle edge case where clockin length is less than clockout length
    if (
      worker.clockDates.clockIn.length <= worker.clockDates.clockOut.length ||
      !worker.clockDates.clockIn
    ) {
      await clockins.deleteOne({ _id: clockInData._id });
      return interaction.editReply({
        content: `Corresponding clockin not found. Please manually enter your hours.\nKindly report this to <@${process.env.MARTIAL}>`,
        flags: 64,
      });
    }

    const roles = await Roles.findOne({ guildId: workers.guildId });
    const workerRole = roles.roles.find((role) => role.id === worker.roleId);

    await handleWorkerBreak(worker, workers);

    // Generate the embeds
    const { embed, clockOutEmbed } = await generateEmbed(
      interaction,
      worker,
      workers,
      workerRole,
      workersDescription
    );

    // Update the worker document accordingly
    await handleWorkerEvents("clockout", interaction.user.id, workers.guildId);

    await clockins.deleteOne({ _id: clockInData._id });

    console.log(`📢 Published clockout event for user ${interaction.user.id}`);

    // Send the sessions data to the user
    await interaction.editReply({
      embeds: [embed],
      components: [],
      files: [],
    });

    // Send the session data to the log channel
    const guildSettings = await guildDB.findOne({ guildId: workers.guildId });

    if (!guildSettings?.logChannelId) return;

    const guild2 = client.guilds.cache.get(guildSettings.guildId);
    const log = guild2.channels.cache.get(guildSettings.logChannelId);

    embed.setTitle(`${interaction.user.tag} has clocked out!`);

    log.send({ content: `${interaction.user}`, embeds: [clockOutEmbed] });

    // Publish the clockout event
    await redisPS.publish(
      "clockout_event",
      JSON.stringify({
        userId: interaction.user.id,
        guildId: workers.guildId,
        timestamp: Date.now(),
      })
    );

    // Remove the delayed job
    await removeDelayedJob(interaction.user.id, interaction.message.id);
  },
};

async function handleWorkerBreak(worker, workers) {
  if (worker.status === "Break") {
    worker.afkDates.afkOut.push(Date.now());
    worker.breakTime +=
      (worker.afkDates.afkOut[worker.afkDates.afkOut.length - 1] -
        worker.afkDates.afkIn[worker.afkDates.afkOut.length - 1]) /
      1000 /
      60 /
      60;
  }

  await workers.save();
}
