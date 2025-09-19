const { EmbedBuilder } = require("discord.js");
const GuildSettings = require("../../models/guildSettings");
const { getEligibleAdmins } = require("../../utils/holiday/getEligibleAdmins");
const { sendDMsToAdmins } = require("../../utils/holiday/sendDmToAdmin");
const sendAfkEndNotification = require("./sendAfkEndNotification");

// 📌 Handles the "holidayStart" job
async function handleAfkStart(job, client) {
  const { guildId, userId, messageId, afkReminderTime } = job.data;
  console.log(`Processing afk start for User: ${userId}, Guild: ${guildId}`);

  // Searches the bot admin roles for the guild
  const guildSettings = await GuildSettings.findOne({ guildId }).lean();
  if (!guildSettings?.botAdminRole?.length) {
    console.log(`⚠️ No bot admin roles found for Guild: ${guildId}`);
    return;
  }

  // Fetches the eligible admins for the guild and sends them a DM
  const admins = await getEligibleAdmins(
    client,
    guildId,
    guildSettings.botAdminRole
  );
  if (!admins.length) return;

  const embed = new EmbedBuilder()
    .setTitle("⏰ Afk Tracking Started")
    .setColor("#4CAF50")
    .setDescription(`A user has started their work or has got back to work.`)
    .addFields(
      { name: "👤 User", value: `<@${userId}>`, inline: true },
      {
        name: "📅 Start Time",
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: true,
      }
    )
    .setTimestamp();

  await sendDMsToAdmins(admins, embed, null, userId);
}

// 📌 Handles the "afkEnd" job
async function handleAfkEnd(job, client) {
  const { guildId, userId, messageId, startDate, endDate } = job.data;
  console.log(`Processing afk end for User: ${userId}, Guild: ${guildId}`);

  await sendAfkEndNotification(
    client,
    userId,
    startDate,
    endDate,
    guildId,
    messageId
  );
}

module.exports = { handleAfkStart, handleAfkEnd };
