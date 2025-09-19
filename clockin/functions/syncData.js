const messageIds = require("../models/messageIds.js");
const Workers = require("../models/worker.js");
const HolidaysTimers = require("../models/holidaysTimers.js");
const client = require("..");
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");

// Status emojis mapping
const STATUS_EMOJIS = {
  Work: "<a:online:1340287493701894216>",
  Break: "<a:offline:1340288336945741874>",
  Holiday: "<a:holiday:1340288540625342505>",
};

function formatDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper function to get active workers list
async function getActiveWorkersList(workers, client) {
  let valueList = "";
  const activeWorkers = workers.workers.filter((worker) =>
    ["Work", "Break"].includes(worker.status)
  );

  for (const worker of activeWorkers) {
    const user = await client.users.cache.get(worker.userId);
    if (!user) {
      worker.status = "Offline";
      await workers.save();
      continue;
    }

    const emoji = STATUS_EMOJIS[worker.status];
    valueList += `${emoji} ${user.username}\n`;
  }

  return valueList || "`None`";
}

// Helper function to get holidays list
async function getHolidaysList(holidays, client) {
  let holidaysList = "";

  for (const timeoff of holidays) {
    const user = await client.users.cache.get(timeoff.userId);
    if (user) {
      holidaysList += `${STATUS_EMOJIS.Holiday} ${user.username} [${formatDate(
        timeoff.endDate
      )}]\n`;
    }
  }

  return holidaysList || "`None`";
}

async function updateClockInMessage(guildId) {
  try {
    // Fetch the clockin message data from the database
    const clockIn = await messageIds.findOne({
      name: "clockIn",
      guildId: guildId,
    });

    const guild = await client.guilds.cache.get(guildId);
    if (!guild) {
      console.log("ERROR: ClockIn message guild not found");
      return;
    }

    const channel = guild.channels.cache.get(clockIn.channelId);
    if (!channel) {
      console.log("ERROR: ClockIn message channel not found");
      return;
    }

    const msg = await channel.messages.fetch(clockIn.id);
    const embed = new EmbedBuilder(msg.embeds[1]);

    // Fetch workers and holidays data
    const workers = await Workers.findOne({ guildId: guildId });
    const holidays = await HolidaysTimers.find({
      guildId: guildId,
      type: "end",
    });

    // Generate lists
    const valueList = await getActiveWorkersList(workers, client);
    const holidaysList = await getHolidaysList(holidays, client);

    // Update embed fields
    embed.setFields(
      { name: msg.embeds[1].fields[0].name, value: valueList, inline: true },
      { name: msg.embeds[1].fields[1].name, value: holidaysList, inline: true }
    );

    // Update the message
    await msg.edit({ embeds: [msg.embeds[0], embed] });
  } catch (error) {
    console.error("Error updating clock in message:", error);
  }
}

async function setupStatusMessage(settings, guild) {
  // Generate worker voice chats string
  let workerVoiceChatsString =
    settings.workerVoiceChats
      .map((voiceChat) => `- <#${voiceChat}>\n`)
      .join("") || "None";

  // Generate bot admin roles string
  let botAdminRolesString =
    settings.botAdminRole.map((role) => `- <@&${role}>\n`).join("") || "None";

  // Generate voice exempt role string
  let voiceExemptRoleString =
    settings.voiceExemptRole.map((role) => `- <@&${role}>\n`).join("") ||
    "None";

  //Generate the status embed for the setup
  const embed = new EmbedBuilder()
    .setColor("#81e6ff")
    .setTitle("Current setup status")
    .setFooter({
      text: `${guild.name} - ${settings.plan || "None"} plan`,
      iconURL: guild.iconURL(),
    })
    .addFields(
      // Target time in hours
      {
        name: "<:icon_bullseye:1337374470675107890> Target time",
        value: settings.targetHours ? `${settings.targetHours} hours` : "None",
        inline: true,
      },
      // Max afk hours
      {
        name: "<:icon_afk_reminder:1337374749139140638> Max Afk hours",
        value: settings.maxAfkHours ? `${settings.maxAfkHours} hours` : "None",
        inline: true,
      },
      // Afk reminder interval
      {
        name: "<:icon_afk_bell:1337375186638471178> Afk reminder interval",
        value: settings.afkReminders
          ? `${settings.afkReminders} hours`
          : "None",
        inline: true,
      },
      // Log channel
      {
        name: "<:log:1275148696509485087> Log channel",
        value: settings.logChannelId ? `<#${settings.logChannelId}>` : "None",
        inline: true,
      },
      // Weekly report channel
      {
        name: "<:icon_logs:1337375361142624296> Weekly report channel",
        value: settings.weeklyReportChannelId
          ? `<#${settings.weeklyReportChannelId}>`
          : "None",
        inline: true,
      },
      // Worker voice chats
      {
        name: "<:icon_voice:1337375569028972687> Worker Voice Chats",
        value: workerVoiceChatsString,
        inline: false,
      },
      // Bot manager role
      {
        name: "<:icon_admin:1337375716127277077> Bot manager role",
        value: botAdminRolesString,
        inline: true,
      },
      // Voice exempt role
      {
        name: "<:icon_mute:1337375881815130174> Voice Exempt role",
        value: voiceExemptRoleString,
        inline: true,
      },
      {
        name: "<:icon_timezone:1337373727633182771> Server Timezone",
        value: settings.timeZone || "Europe/London",
        inline: true,
      }
    );

  // Generate the buttons for the setup status message
  const buttons = new ActionRowBuilder().addComponents(
    // Target time button
    new ButtonBuilder()
      .setEmoji("<:bullseyearrow:1275146071659646997>")
      .setStyle("Secondary")
      .setCustomId("setup_targetTime_button"),
    // Max afk hours button
    new ButtonBuilder()
      .setEmoji("<:bell:1340541898804428902>")
      .setStyle("Secondary")
      .setCustomId("setup_afkReminder_button"),
    // Log channel button
    new ButtonBuilder()
      .setEmoji("<:log:1275148696509485087>")
      .setStyle("Secondary")
      .setCustomId("setup_log_button"),
    // Weekly report channel button
    new ButtonBuilder()
      .setEmoji("<:moneylog:1340541984959369336>")
      .setStyle("Secondary")
      .setCustomId("setup_weeklyReport_button"),
    // Worker voice chats button
    new ButtonBuilder()
      .setEmoji("<:volume:1275149715251662959>")
      .setStyle("Secondary")
      .setCustomId("setup_workerVoiceChats_button")
  );

  // Generate the second row of buttons because of the 5 button limit
  const buttons2 = new ActionRowBuilder().addComponents(
    // Bot manager role button
    new ButtonBuilder()
      .setEmoji("<:admin:1340541782810951741>")
      .setStyle("Secondary")
      .setCustomId("setup_adminRole_button"),
    // Voice exempt role button
    new ButtonBuilder()
      .setEmoji("<:noneVolume:1340541960850771991>  ")
      .setStyle("Secondary")
      .setCustomId("setup_voiceExemptRole_button"),
    new ButtonBuilder()
      .setEmoji("<:icon_timezone:1337373727633182771>")
      .setStyle("Secondary")
      .setCustomId("setup_timeZone_button")
  );

  return [embed, [buttons, buttons2]];
}

module.exports = { updateClockInMessage, setupStatusMessage };
