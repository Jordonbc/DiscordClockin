const MessageIds = require("../../models/messageIds");
const Workers = require("../../models/guildWorkers");
const HolidayTimers = require("../../models/holidayTimers");
const { EmbedBuilder } = require("discord.js");
const GuildWorkers = require("../../models/guildWorkers");
const connectToDatabase = require("../../utils/database/db");

module.exports = async (client) => {
  console.log(`Logged in as ${client.user.tag}! [Reporter]`);
};
