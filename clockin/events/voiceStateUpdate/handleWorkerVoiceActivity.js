const client = require("../../index.js");
const GuildWorkers = require("../../models/worker.js");
const GuildSettings = require("../../models/guildSettings.js");
const clockins = require("../../models/clockins.js");
const Role = require("../../models/roles.js");
const AfkTimer = require("../../models/afkReminders.js");
const afkQueue = require("../../queues/afkQueue.js");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { drawAFK, drawClockedin } = require("../../functions/drawImages.js");
const {
  handleAfkSystem,
} = require("../../functions/afkSystem/handleAfkSystem.js");
const redisPS = require("../../utils/redisPubSubClient.js");
const { updateClockInMessage } = require("../../functions/syncData.js");

module.exports = async (client, oldMember, newMember) => {
  // Fetch the guild settings
  const settings = await GuildSettings.findOne({ guildId: newMember.guild.id });

  if (!settings) {
    return console.log(
      `❌ Guild settings not found for guild: ${newMember.guild.id} - Guild is not subscribed to the bot`
    );
  }

  // If the user has the voice exempt role, we return
  if (newMember.member.roles.cache.get(settings?.voiceExemptRole)) return;

  // Check if the user left a worker voice chat or joined a non-worker voice chat
  if (
    !newMember.channelId ||
    !settings.workerVoiceChats.includes(newMember.channelId)
  ) {
    await handleWorkerAFK(newMember, settings);
  }
  // Check if the user joined a worker voice chat from no channel
  else if (
    !oldMember.channelId &&
    settings.workerVoiceChats.includes(newMember.channelId)
  ) {
    await handleWorkerReturn(newMember, settings);
  }

  // Publish the voice event to update embed
  await redisPS.publish(
    "voice_event",
    JSON.stringify({
      userId: newMember.member.id,
      guildId: newMember.guild.id,
      timestamp: Date.now(),
    })
  );
};

/**
 * Handles the logic when a worker goes AFK (leaves a worker voice chat or joins a non-worker voice chat).
 * @param {GuildMember} newMember - The member whose voice state changed.
 * @param {Object} settings - The guild settings.
 */
async function handleWorkerAFK(newMember, settings) {
  const guild = await GuildWorkers.findOne({ guildId: newMember.guild.id });
  const roles = await Role.findOne({ guildId: newMember.guild.id });
  const worker = guild.workers.find((worker) => worker.userId === newMember.id);

  if (worker && worker.status === "Work") {
    const clockInData = await clockins.findOne({
      userId: newMember.id,
      guildId: newMember.guild.id,
    });

    // Create buttons for the user to interact with
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Clock out")
        .setStyle("Danger")
        .setCustomId("clockout_new_button"),
      new ButtonBuilder()
        .setLabel("I'm back")
        .setStyle("Secondary")
        .setCustomId("break_new_button")
    );

    // Update worker status to "Break"
    worker.status = "Break";
    worker.breaksCount++;
    worker.afkDates.afkIn.push(Date.now());
    await guild.save();

    const workerRole = roles.roles.find((role) => role.id === worker.roleId);
    const user = await client.users.cache.get(newMember.id);
    const dmChannel = await user.createDM();

    // Fetch the clock-in message and update it
    const clockinMsg = await dmChannel.messages.fetch(clockInData.messageId);
    await clockinMsg.edit({
      components: [buttons],
      files: [await drawAFK(newMember.guild.id, user, workerRole)],
    });

    // Send an embed message to the user
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription(
        "I automatically put you on pause because you are no longer in a worker voice chat."
      );
    await user.send({ embeds: [embed], flags: 64 });

    //REMOVE THE DELAYED JOB
    await removeDelayedJob(worker.userId, worker.clockInMessage);
  }
}

/**
 * Handles the logic when a worker returns to a worker voice chat.
 * @param {GuildMember} newMember - The member whose voice state changed.
 * @param {Object} settings - The guild settings.
 */
async function handleWorkerReturn(newMember, settings) {
  const guild = await GuildWorkers.findOne({ guildId: newMember.guild.id });
  const roles = await Role.findOne({ guildId: newMember.guild.id });
  const worker = guild.workers.find((worker) => worker.userId === newMember.id);

  if (worker?.status === "Break") {
    const clockInData = await clockins.findOne({
      userId: newMember.id,
      guildId: newMember.guild.id,
    });

    // Create buttons for the user to interact with
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Clock out")
        .setStyle("Danger")
        .setCustomId("clockout_new_button"),
      new ButtonBuilder()
        .setLabel("Break")
        .setStyle("Secondary")
        .setCustomId("break_new_button")
    );

    // Update worker status to "Work"
    worker.status = "Work";
    worker.afkDates.afkOut.push(Date.now());
    worker.breakTime +=
      (worker.afkDates.afkOut[worker.afkDates.afkOut.length - 1] -
        worker.afkDates.afkIn[worker.afkDates.afkIn.length - 1]) /
      1000 /
      60 /
      60;
    worker.afkDates.afkOut = [];
    worker.afkDates.afkIn = [];
    await guild.save();

    const workerRole = roles.roles.find((role) => role.id === worker.roleId);
    const user = await client.users.cache.get(newMember.id);
    const dmChannel = await user.createDM();

    // Fetch the clock-in message and update it
    const clockinMsg = await dmChannel.messages.fetch(clockInData.messageId);
    await clockinMsg.edit({
      components: [buttons],
      files: [await drawClockedin(newMember.guild.id, user, workerRole)],
    });

    // Send an embed message to the user
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(
        "I've just clocked you back in because you're in one of the working voice chats again."
      );
    await user.send({ embeds: [embed], flags: 64 });

    //RE-ADD THE DELAYED JOB
    handleAfkSystem(guild.guildId, worker.userId, worker.clockInMessage, 6);

    // Update the clock-in message in the guild
    // updateClockInMessage(newMember.guild.id);
  }
}

async function removeDelayedJob(userId, messageId) {
  const TimerId = await AfkTimer.findOne({
    messageId: messageId,
  }).lean();

  const afkEndJob = await afkQueue.getJob(TimerId?.redisJobId);
  if (afkEndJob) {
    afkEndJob.remove();
    await AfkTimer.deleteOne({ messageId: messageId });
    console.log(`✅ Afk end job removed for user ${userId}`);
  } else {
    console.log(
      `❌ Afk end job with id: ${TimerId?.redisJobId} not found for message ${messageId}`
    );
  }
}
