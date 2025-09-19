const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
} = require("discord.js");
require("dotenv").config();
const Settings = require("../models/guildSettings.js");
const GuildWorkers = require("../models/worker.js");
const Roles = require("../models/roles.js");
const clockins = require("../models/clockins.js");
const { handleAfkSystem } = require("./afkSystem/handleAfkSystem.js");
const {
  checkVoiceChatExemption,
} = require("./clockin/checkVoiceChatExemption.js");
const {
  checkIfWorkingOrOnBreak,
  checkIfOffline,
} = require("./clockin/workerStatusChecks.js");
const { formatTime } = require("./clockin/formatTime.js");
const { createClockInCanvas } = require("./clockin/canvasUtils.js");
const redisPS = require("../utils/redisPubSubClient");
const handleWorkerEvents = require("./handleWorkerEvents.js");

// const guildId = process.env.GUILD_ID;

async function clockIn(interaction) {
  if (!interaction) return;
  console.log("The user clicked clock in from the setup select menu");

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Check if the array/list of workers exists
    let guildWorkers = await GuildWorkers.findOne({
      guildId: interaction.guild.id,
    });

    // If the workers are not found, create a new array/list
    if (!guildWorkers) {
      guildWorkers = new GuildWorkers({
        guildId: interaction.guild.id,
      });
      await guildWorkers.save();
    }

    // Check if the guild has existing roles
    const roles = await Roles.findOne({ guildId: interaction.guild.id });
    if (!roles || roles.categorys.length === 0) {
      const noRoles = new EmbedBuilder()
        .setTitle("ERROR: Clock in")
        .setColor("#FF0000")
        .setDescription(
          "You can't start to clock in, because no roles are existing."
        );

      return interaction.editReply({ embeds: [noRoles] });
    }

    // Find the worker in the workers list
    let worker = guildWorkers.workers.find(
      (worker) => worker.userId === interaction.user.id
    );

    // If the worker is not found, return a message to register first
    if (!worker) {
      const embed = new EmbedBuilder()
        .setDescription(
          "Hey, you need to create a profile before you can start working. Please click the `register` option in the select menu to register yourself!"
        )
        .setColor("#FF0000");

      return interaction.editReply({ embeds: [embed] });
    }

    // Fetch the guild settings
    const guildSettings = await Settings.findOne({
      guildId: interaction.guild.id,
    });

    // Check if the worker is already working or on break
    const canProceed = await checkIfWorkingOrOnBreak(
      worker,
      interaction,
      clockins,
      guildWorkers
    );
    if (!canProceed) return;

    // Ensure the worker is offline before clocking in
    const isOffline = await checkIfOffline(worker, interaction);
    if (!isOffline) return;

    // Check if the user is exempted from voice chat requirement
    const voiceChatCheck = await checkVoiceChatExemption(
      interaction,
      guildSettings
    );

    if (!voiceChatCheck.success) {
      return interaction.editReply({ embeds: [voiceChatCheck.embed] });
    }

    //This part of code runs if the user was actually offline and is clocking in to work now

    // Check if the worker has a role assigned
    const workerRole = roles.roles.find((role) => role.id === worker.roleId);
    if (!workerRole) {
      return interaction.editReply({
        content:
          "Your assigned role is missing. Please contact an administrator.",
        ephemeral: true,
      });
    }

    // Format the current time according to the guild's timezone
    const timeZone = guildSettings?.timeZone || "Europe/London";
    const timeParts = formatTime(timeZone); // Call the new function

    // Create the clock in canvas
    const attachment = await createClockInCanvas(
      worker,
      interaction,
      workerRole.name,
      timeParts
    );

    // Create the buttons for the user to clock out or go on break
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Clock out")
        .setStyle("Danger")
        .setDisabled(false)
        .setCustomId("clockout_new_button"),
      new ButtonBuilder()
        .setLabel("Break")
        .setStyle("Secondary")
        .setDisabled(false)
        .setCustomId("break_new_button")
    );

    // Send the canvas and buttons to the user in a DM
    try {
      const m = await interaction.member.send({
        files: [attachment],
        components: [buttons],
      });

      // Update worker document accordingly
      await handleWorkerEvents(
        "clockin",
        worker.userId,
        guildWorkers.guildId,
        m.id
      );

      // Save or update the clock-in message details //todo: modify model to include dates
      await clockins.findOneAndUpdate(
        { userId: interaction.user.id, guildId: interaction.guild.id },
        {
          userId: interaction.user.id,
          guildId: interaction.guild.id,
          messageId: m.id,
        },
        { upsert: true, new: true }
      );

      // Start AFK reminders if enabled for the specific message
      if (
        guildSettings?.afkReminders > 0 &&
        guildSettings?.afkReminders <= 60
      ) {
        handleAfkSystem(
          interaction.guild.id,
          interaction.user.id,
          m.id,
          guildSettings.afkReminders
        );
      }

      // Edit the interaction reply to confirm successful clock-in
      await interaction.editReply({
        content: `You successfully started working! [I sent you a DM](<${m.url}>).`,
        ephemeral: true,
      });

      console.log(
        `User ${interaction.user.id} clocked in at ${new Date().toISOString()}`
      );
    } catch (error) {
      console.error("Failed to send DM:", error);
      await interaction.editReply({
        content:
          "Your DMs are closed! Please enable DMs to receive clock-in details.",
        ephemeral: true,
      });
    }

    // Publish the clock-in event to the Redis Pub/Sub channel to update the embed
    await redisPS.publish(
      "clockin_event",
      JSON.stringify({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        timestamp: Date.now(),
      })
    );

    console.log(`📢 Published clockin event for user ${interaction.user.id}`);
  } catch (error) {
    console.error("Error in clockIn function:", error);
    return interaction.editReply({
      content:
        "An error occurred while processing your request. Please try again.",
      ephemeral: true,
    });
  }
}

module.exports = clockIn;
