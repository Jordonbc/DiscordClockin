const GuildWorkers = require("../models/guildWorkers");
const ClockIns = require("../models/clockins");
const connectToDatabase = require("../utils/database/db");
const HolidayTimers = require("../models/holidayTimers");
const MessageIds = require("../models/messageIds");
const { EmbedBuilder } = require("discord.js");

// 📌 Update the clockin message with the latest worker status

async function updateClockinMessage(client, guildId) {
  try {
    await connectToDatabase();

    //Fetch the clockin message data from the database
    const clockInMessage = await MessageIds.findOne({ guildId });
    if (!clockInMessage)
      throw new Error("Clockin message not found in database");

    const guildWorkers = await GuildWorkers.findOne({ guildId }).lean();

    // Fetch the holidays timers data from the database
    const holidayTimers = await HolidayTimers.find({ guildId });
    if (!holidayTimers) throw new Error("Holidays timers not found");

    // Fetch the guild from the client cache
    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new Error("Guild not found");

    // find a specific message in a specific channel
    const channel = guild.channels.cache.get(clockInMessage.channelId);

    const message = await channel.messages.fetch(clockInMessage.id);
    if (!message) throw new Error("Clockin message not found");

    // Create a new embed builder from the existing embed
    const embed = EmbedBuilder.from(message.embeds[0]);

    // Fetch the workers and holidays data
    const activeWorkers = guildWorkers.workers.filter(
      (worker) => worker.status === "Work"
    );
    const onBreakWorkers = guildWorkers.workers.filter(
      (worker) => worker.status === "Break"
    );
    const today = new Date();
    const activeHolidayList = holidayTimers.filter(
      (holiday) =>
        holiday.status === "scheduled" &&
        holiday.startDate <= today &&
        holiday.endDate >= today
    );

    // Update embed fields with fresh data
    embed.setFields([
      {
        name: "👷 Active Workers",
        value: activeWorkers.length
          ? activeWorkers
              .map(
                (worker) => `<a:online:1347491912315310140><@${worker.userId}>`
              )
              .join("\n")
          : "`None`",
        inline: true,
      },
      {
        name: "🍹 On Break",
        value: onBreakWorkers.length
          ? onBreakWorkers
              .map(
                (worker) => `<a:offline:1347491939091615775><@${worker.userId}>`
              )
              .join("\n")
          : "`None`",
        inline: true,
      },
      {
        name: "🏖️ On Holidays",
        value: activeHolidayList.length
          ? activeHolidayList
              .map(
                (holiday) =>
                  `<:status_holidays:1347491988781404171><@${holiday.userId}>`
              )
              .join("\n")
          : "`None`",
        inline: true,
      },
    ]);

    // Update the message with the modified embed
    await message.edit({ embeds: [embed] });
  } catch (error) {
    console.error(`Failed to update clockin message for ${guildId}:`, error);
  }
}

module.exports = updateClockinMessage;
